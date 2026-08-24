-- Migration 006: Fix create_purchase to properly handle payables with due_date

create or replace function create_purchase(p_payload jsonb) returns jsonb language plpgsql as $$
declare
  v_business uuid := current_business_id();
  v_user uuid := current_user_id();
  v_line jsonb;
  v_item items%rowtype;
  v_total numeric := 0;
  v_paid numeric := greatest(0, coalesce((p_payload->>'paid_amount')::numeric, 0));
  v_tx uuid;
  v_payable uuid;
  v_status payment_status;
begin
  -- Validate supplier and items
  if nullif(p_payload->>'supplier_id', '') is null
     or jsonb_array_length(coalesce(p_payload->'items', '[]'::jsonb)) = 0 then
    raise exception using errcode = '22023', message = 'Supplier dan minimal satu bahan wajib diisi';
  end if;

  -- Validate items and calculate total (with FOR UPDATE for atomicity)
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item
    from items
    where id = (v_line->>'item_id')::uuid
      and business_id = v_business
      and item_type = 'RAW_MATERIAL'
    for update;

    if not found or (v_line->>'qty')::numeric <= 0 or (v_line->>'price')::numeric < 0 then
      raise exception using errcode = '22023', message = 'Detail pembelian tidak valid';
    end if;

    v_total := v_total + (v_line->>'qty')::numeric * (v_line->>'price')::numeric;
  end loop;

  -- Auto-set paid amount for LUNAS
  if p_payload->>'payment_status' = 'LUNAS' and p_payload->>'paid_amount' is null then
    v_paid := v_total;
  end if;

  if v_paid > v_total then
    raise exception using errcode = '22023', message = 'Pembayaran awal melebihi total pembelian';
  end if;

  v_status := case
    when v_paid >= v_total then 'LUNAS'
    when v_paid > 0 then 'SEBAGIAN'
    else 'BELUM_LUNAS'
  end;

  -- Create transaction
  insert into transactions (
    business_id, party_id, created_by, transaction_type, payment_method,
    payment_status, subtotal, total, paid_amount, occurred_at
  ) values (
    v_business, (p_payload->>'supplier_id')::uuid, v_user, 'PURCHASE',
    nullif(p_payload->>'payment_method', '')::payment_method,
    v_status, v_total, v_total, v_paid,
    coalesce((p_payload->>'occurred_at')::timestamptz, now())
  ) returning id into v_tx;

  -- Insert transaction items and update stock
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item from items where id = (v_line->>'item_id')::uuid;

    insert into transaction_items (business_id, transaction_id, item_id, qty, unit_price, subtotal)
    values (v_business, v_tx, v_item.id,
            (v_line->>'qty')::numeric, (v_line->>'price')::numeric,
            (v_line->>'qty')::numeric * (v_line->>'price')::numeric);

    update items
    set stock_qty = stock_qty + (v_line->>'qty')::numeric,
        last_buy_price = (v_line->>'price')::numeric
    where id = v_item.id;
  end loop;

  -- Create payable if not fully paid
  if v_paid < v_total then
    insert into payables (business_id, transaction_id, supplier_id, amount, paid_amount, status, due_date)
    values (
      v_business, v_tx, (p_payload->>'supplier_id')::uuid,
      v_total, v_paid, v_status,
      nullif(p_payload->>'due_date', '')::date
    ) returning id into v_payable;
  end if;

  -- Audit log
  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  values (v_business, v_user, 'purchase_created', 'transaction', v_tx,
          jsonb_build_object('total', v_total, 'paid', v_paid, 'status', v_status));

  return jsonb_build_object(
    'transaction_id', v_tx,
    'payable_id', v_payable,
    'total', v_total,
    'paid_amount', v_paid,
    'status', v_status
  );
end $$;
