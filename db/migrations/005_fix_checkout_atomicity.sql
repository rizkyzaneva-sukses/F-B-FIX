-- Migration 005: Fix checkout atomicity and stock validation
-- Replace checkout_pos with atomic version that prevents race conditions

create or replace function checkout_pos(p_payload jsonb) returns jsonb language plpgsql as $$
declare
  v_business uuid := current_business_id();
  v_user uuid := current_user_id();
  v_role text := request_claim('role');
  v_tx uuid;
  v_method payment_method := (p_payload->>'payment_method')::payment_method;
  v_total numeric(15,2) := 0;
  v_count integer;
  v_line jsonb;
  v_item items%rowtype;
  v_qty numeric;
  v_party uuid := nullif(p_payload->>'party_id', '')::uuid;
  v_override_reason text := nullif(p_payload->>'override_reason', '');
begin
  if v_business is null or v_user is null then
    raise exception using errcode = '42501', message = 'Sesi tidak valid';
  end if;

  -- Plan limit check (server-side, atomic)
  select count(*) into v_count
  from transactions
  where business_id = v_business
    and transaction_type = 'SALE'
    and occurred_at >= date_trunc('month', now());

  if (select plan from businesses where id = v_business) = 'FREE'
     and v_count >= (select sales_transaction_limit from businesses where id = v_business) then
    raise exception using errcode = 'P0001', message = 'Batas transaksi bulan ini telah tercapai. Upgrade ke PRO untuk melanjutkan.';
  end if;

  -- Validate items and calculate total (single pass with FOR UPDATE to prevent race conditions)
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item
    from items
    where id = (v_line->>'item_id')::uuid
      and business_id = v_business
      and item_type = 'PRODUCT'
      and is_active = true
    for update;  -- Lock row to prevent concurrent modification

    if not found then
      raise exception using errcode = 'P0002', message = 'Produk tidak ditemukan';
    end if;

    v_qty := (v_line->>'qty')::numeric;
    if v_qty <= 0 then
      raise exception using errcode = '22023', message = 'Kuantitas produk tidak valid';
    end if;

    -- Stock validation: only owner can override with reason
    if v_item.track_stock and v_item.stock_qty < v_qty then
      if v_role <> 'OWNER' or v_override_reason is null or length(trim(v_override_reason)) < 5 then
        raise exception using errcode = 'P0003',
          message = format('Stok %s tidak mencukupi. Tersedia: %s.', v_item.name, v_item.stock_qty);
      end if;
    end if;

    v_total := v_total + v_qty * coalesce((v_line->>'unit_price')::numeric, v_item.sale_price);
  end loop;

  -- Validate cart not empty
  if jsonb_array_length(coalesce(p_payload->'items', '[]'::jsonb)) = 0 then
    raise exception using errcode = '22023', message = 'Keranjang kosong';
  end if;

  -- Validate payment method specifics
  if v_method = 'HUTANG' then
    if v_party is null or nullif(p_payload->>'due_date', '') is null then
      raise exception using errcode = '22023', message = 'Pelanggan dan jatuh tempo wajib diisi';
    end if;
    if not exists (select 1 from parties where id = v_party and business_id = v_business and party_type = 'CUSTOMER' and is_active) then
      raise exception using errcode = '22023', message = 'Pelanggan tidak ditemukan';
    end if;
    -- Credit limit check
    if (select credit_limit from parties where id = v_party and business_id = v_business) > 0
       and v_total + coalesce((select sum(amount - paid_amount) from receivables where customer_id = v_party and business_id = v_business), 0)
           > (select credit_limit from parties where id = v_party and business_id = v_business) then
      raise exception using errcode = '22023', message = 'Total penjualan melebihi limit piutang pelanggan';
    end if;
  end if;

  if v_method = 'TUNAI' and (p_payload->>'paid_amount')::numeric < v_total then
    raise exception using errcode = '22023', message = 'Nominal tunai kurang dari total';
  end if;

  -- Create transaction
  insert into transactions (
    business_id, party_id, created_by, transaction_type, payment_method,
    payment_status, subtotal, total, paid_amount, change_amount, override_reason
  ) values (
    v_business, v_party, v_user, 'SALE', v_method,
    case when v_method = 'HUTANG' then 'BELUM_LUNAS' else 'LUNAS' end,
    v_total, v_total,
    case when v_method = 'HUTANG' then 0 else (p_payload->>'paid_amount')::numeric end,
    case when v_method = 'TUNAI' then (p_payload->>'paid_amount')::numeric - v_total else 0 end,
    v_override_reason
  ) returning id into v_tx;

  -- Insert transaction items and update stock (atomic per item)
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item from items where id = (v_line->>'item_id')::uuid for update;
    v_qty := (v_line->>'qty')::numeric;

    insert into transaction_items (business_id, transaction_id, item_id, qty, unit_price, subtotal, cogs_at_sale)
    values (v_business, v_tx, v_item.id, v_qty,
            coalesce((v_line->>'unit_price')::numeric, v_item.sale_price),
            v_qty * coalesce((v_line->>'unit_price')::numeric, v_item.sale_price),
            v_item.last_cogs);

    -- Update stock atomically (row already locked by FOR UPDATE)
    if v_item.track_stock then
      update items set stock_qty = stock_qty - v_qty where id = v_item.id;
    end if;
  end loop;

  -- Create receivable if HUTANG
  if v_method = 'HUTANG' then
    insert into receivables (business_id, transaction_id, customer_id, amount, due_date)
    values (v_business, v_tx, v_party, v_total, (p_payload->>'due_date')::date);
  end if;

  -- Audit log (store only relevant data, not full payload)
  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  values (v_business, v_user, 'pos_sale_completed', 'transaction', v_tx,
          jsonb_build_object(
            'total', v_total,
            'method', v_method,
            'item_count', jsonb_array_length(p_payload->'items'),
            'override', v_override_reason is not null
          ));

  return jsonb_build_object(
    'transaction_id', v_tx,
    'total', v_total,
    'change_amount', case when v_method = 'TUNAI' then (p_payload->>'paid_amount')::numeric - v_total else 0 end
  );
end $$;
