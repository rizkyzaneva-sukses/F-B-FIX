-- Migration 009: Cashier write access, atomic registration, collision-free batch codes
--
-- 1. checkout_pos becomes SECURITY DEFINER so KASIR can actually complete a sale.
--    Migration 003 tightened tenant_write to require request_claim('role') = 'OWNER'
--    on every table, which is correct for direct table access but also blocked the
--    POS flow entirely: checkout_pos ran as the caller, so a cashier's INSERT into
--    transactions was rejected by RLS. Running it as definer bypasses RLS; the role
--    and tenant checks below are what authorise the write instead.
-- 2. register_business() makes signup atomic — no more orphan business rows when the
--    user INSERT fails after the business INSERT succeeded.
-- 3. Batch codes are serialised per business with an advisory lock so two concurrent
--    productions can't generate the same BATCH-YYMMDD-NNN and violate the unique index.

-- ---------------------------------------------------------------------------
-- 1. POS checkout, runnable by OWNER and KASIR
-- ---------------------------------------------------------------------------
create or replace function checkout_pos(p_payload jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid := current_business_id();
  v_user uuid := current_user_id();
  v_role text := request_claim('role');
  v_tx uuid;
  v_method payment_method := (p_payload->>'payment_method')::payment_method;
  v_total numeric(15,2) := 0;
  v_count integer;
  v_limit integer;
  v_plan plan_type;
  v_line jsonb;
  v_item items%rowtype;
  v_qty numeric;
  v_party uuid := nullif(p_payload->>'party_id', '')::uuid;
  v_override_reason text := nullif(p_payload->>'override_reason', '');
begin
  -- SECURITY DEFINER means RLS no longer guards this function; these checks do.
  if v_business is null or v_user is null then
    raise exception using errcode = '42501', message = 'Sesi tidak valid';
  end if;
  if v_role not in ('OWNER', 'KASIR') then
    raise exception using errcode = '42501', message = 'Peran tidak berhak melakukan transaksi';
  end if;
  -- The acting user must really belong to the business named in the token.
  if not exists (
    select 1 from app_users
    where id = v_user and business_id = v_business and is_active
  ) then
    raise exception using errcode = '42501', message = 'Pengguna tidak terdaftar pada bisnis ini';
  end if;

  -- Plan limit check (server-side, atomic)
  select plan, sales_transaction_limit into v_plan, v_limit
  from businesses where id = v_business;

  if not found then
    raise exception using errcode = '42501', message = 'Bisnis tidak ditemukan';
  end if;

  select count(*) into v_count
  from transactions
  where business_id = v_business
    and transaction_type = 'SALE'
    and occurred_at >= date_trunc('month', now());

  if v_plan = 'FREE' and v_count >= v_limit then
    raise exception using errcode = 'P0001',
      message = format('Batas %s transaksi bulan ini telah tercapai. Upgrade ke PRO untuk melanjutkan.', v_limit);
  end if;

  if jsonb_array_length(coalesce(p_payload->'items', '[]'::jsonb)) = 0 then
    raise exception using errcode = '22023', message = 'Keranjang kosong';
  end if;

  -- Validate items and calculate total (FOR UPDATE to prevent concurrent oversell)
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item
    from items
    where id = (v_line->>'item_id')::uuid
      and business_id = v_business
      and item_type = 'PRODUCT'
      and is_active = true
    for update;

    if not found then
      raise exception using errcode = 'P0002', message = 'Produk tidak ditemukan';
    end if;

    v_qty := (v_line->>'qty')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception using errcode = '22023', message = 'Kuantitas produk tidak valid';
    end if;

    -- Overselling requires an owner AND a written reason.
    if v_item.track_stock and v_item.stock_qty < v_qty then
      if v_role <> 'OWNER' or v_override_reason is null or length(trim(v_override_reason)) < 5 then
        raise exception using errcode = 'P0003',
          message = format('Stok %s tidak mencukupi. Tersedia: %s.', v_item.name, v_item.stock_qty);
      end if;
    end if;

    v_total := v_total + v_qty * coalesce((v_line->>'unit_price')::numeric, v_item.sale_price);
  end loop;

  if v_method = 'HUTANG' then
    if v_party is null or nullif(p_payload->>'due_date', '') is null then
      raise exception using errcode = '22023', message = 'Pelanggan dan jatuh tempo wajib diisi';
    end if;
    if not exists (
      select 1 from parties
      where id = v_party and business_id = v_business and party_type = 'CUSTOMER' and is_active
    ) then
      raise exception using errcode = '22023', message = 'Pelanggan tidak ditemukan';
    end if;
    if (select credit_limit from parties where id = v_party and business_id = v_business) > 0
       and v_total + coalesce((select sum(amount - paid_amount) from receivables
                               where customer_id = v_party and business_id = v_business), 0)
           > (select credit_limit from parties where id = v_party and business_id = v_business) then
      raise exception using errcode = '22023', message = 'Total penjualan melebihi limit piutang pelanggan';
    end if;
  end if;

  if v_method = 'TUNAI' and coalesce((p_payload->>'paid_amount')::numeric, 0) < v_total then
    raise exception using errcode = '22023', message = 'Nominal tunai kurang dari total';
  end if;

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

  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item
    from items
    where id = (v_line->>'item_id')::uuid and business_id = v_business
    for update;

    v_qty := (v_line->>'qty')::numeric;

    insert into transaction_items (business_id, transaction_id, item_id, qty, unit_price, subtotal, cogs_at_sale)
    values (v_business, v_tx, v_item.id, v_qty,
            coalesce((v_line->>'unit_price')::numeric, v_item.sale_price),
            v_qty * coalesce((v_line->>'unit_price')::numeric, v_item.sale_price),
            v_item.last_cogs);

    if v_item.track_stock then
      update items set stock_qty = stock_qty - v_qty where id = v_item.id;
    end if;
  end loop;

  if v_method = 'HUTANG' then
    insert into receivables (business_id, transaction_id, customer_id, amount, due_date)
    values (v_business, v_tx, v_party, v_total, (p_payload->>'due_date')::date);
  end if;

  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  values (v_business, v_user, 'pos_sale_completed', 'transaction', v_tx,
          jsonb_build_object(
            'total', v_total,
            'method', v_method,
            'item_count', jsonb_array_length(p_payload->'items'),
            'override', v_override_reason is not null,
            'role', v_role
          ));

  return jsonb_build_object(
    'transaction_id', v_tx,
    'total', v_total,
    'change_amount', case when v_method = 'TUNAI' then (p_payload->>'paid_amount')::numeric - v_total else 0 end
  );
end $$;

-- ---------------------------------------------------------------------------
-- 2. Atomic registration
-- ---------------------------------------------------------------------------
create or replace function register_business(
  p_business_name text,
  p_email text,
  p_name text,
  p_password_hash text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid;
  v_user uuid;
begin
  if coalesce(trim(p_business_name), '') = '' then
    raise exception using errcode = '22023', message = 'Nama usaha wajib diisi';
  end if;
  if coalesce(trim(p_email), '') = '' or coalesce(trim(p_password_hash), '') = '' then
    raise exception using errcode = '22023', message = 'Email dan password wajib diisi';
  end if;

  if exists (select 1 from app_users where lower(email) = lower(trim(p_email))) then
    raise exception using errcode = 'P0005', message = 'Email sudah terdaftar';
  end if;

  insert into businesses (name) values (trim(p_business_name)) returning id into v_business;

  insert into app_users (business_id, email, name, password_hash, role, email_verified)
  values (v_business, lower(trim(p_email)), coalesce(nullif(trim(p_name), ''), split_part(p_email, '@', 1)),
          p_password_hash, 'OWNER', false)
  returning id into v_user;

  perform seed_default_units(v_business);

  return jsonb_build_object('business_id', v_business, 'user_id', v_user);
end $$;

-- ---------------------------------------------------------------------------
-- 3. Collision-free batch codes
-- ---------------------------------------------------------------------------
create or replace function create_production_batch(p_payload jsonb) returns jsonb language plpgsql as $$
declare
  v_business uuid := current_business_id();
  v_user uuid := current_user_id();
  v_output items%rowtype;
  v_material items%rowtype;
  v_line jsonb;
  v_output_qty numeric := (p_payload->>'output_qty')::numeric;
  v_other numeric := coalesce((p_payload->>'other_cost')::numeric, 0);
  v_material_cost numeric := 0;
  v_cogs numeric;
  v_batch uuid;
  v_code text;
begin
  select * into v_output
  from items
  where id = (p_payload->>'output_item_id')::uuid
    and business_id = v_business
    and item_type = 'PRODUCT'
    and is_active
  for update;

  if not found or v_output_qty is null or v_output_qty <= 0 then
    raise exception using errcode = '22023', message = 'Produk output dan kuantitas wajib valid';
  end if;

  if jsonb_array_length(coalesce(p_payload->'materials', '[]'::jsonb)) = 0 then
    raise exception using errcode = '22023', message = 'Minimal satu bahan baku wajib dipilih';
  end if;

  for v_line in select * from jsonb_array_elements(p_payload->'materials') loop
    select * into v_material
    from items
    where id = (v_line->>'item_id')::uuid
      and business_id = v_business
      and item_type = 'RAW_MATERIAL'
      and is_active
    for update;

    if not found or (v_line->>'qty_used')::numeric <= 0 then
      raise exception using errcode = '22023', message = 'Bahan produksi tidak valid';
    end if;

    if v_material.stock_qty < (v_line->>'qty_used')::numeric then
      raise exception using errcode = 'P0004',
        message = format('Stok bahan %s tidak mencukupi. Tersedia: %s %s.',
          v_material.name, v_material.stock_qty,
          (select code from units where id = v_material.unit_id));
    end if;

    v_material_cost := v_material_cost + (v_line->>'qty_used')::numeric * v_material.last_buy_price;
  end loop;

  v_cogs := round((v_material_cost + greatest(v_other, 0)) / v_output_qty, 2);

  -- Serialise code generation per business; count(*)+1 alone races two concurrent
  -- batches into the same code and trips the unique (business_id, batch_code) index.
  perform pg_advisory_xact_lock(hashtext('batch_code:' || v_business::text));

  v_code := 'BATCH-' || to_char(now(), 'YYMMDD') || '-' ||
    lpad((select count(*) + 1 from production_batches
          where business_id = v_business and produced_at::date = current_date)::text, 3, '0');

  insert into production_batches (
    business_id, output_item_id, batch_code, output_qty,
    material_cost, other_cost, cogs_per_unit, created_by
  ) values (
    v_business, v_output.id, v_code, v_output_qty,
    round(v_material_cost, 2), round(greatest(v_other, 0), 2), v_cogs, v_user
  ) returning id into v_batch;

  for v_line in select * from jsonb_array_elements(p_payload->'materials') loop
    select * into v_material from items where id = (v_line->>'item_id')::uuid for update;

    insert into production_materials (business_id, batch_id, item_id, qty_used, unit_cost, total_cost)
    values (v_business, v_batch, v_material.id,
            (v_line->>'qty_used')::numeric, v_material.last_buy_price,
            (v_line->>'qty_used')::numeric * v_material.last_buy_price);

    update items
    set stock_qty = stock_qty - (v_line->>'qty_used')::numeric
    where id = v_material.id;
  end loop;

  update items
  set stock_qty = stock_qty + v_output_qty,
      last_cogs = v_cogs
  where id = v_output.id;

  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  values (v_business, v_user, 'production_batch_saved', 'production_batch', v_batch,
          jsonb_build_object(
            'output_item', v_output.name,
            'output_qty', v_output_qty,
            'cogs_per_unit', v_cogs,
            'material_count', jsonb_array_length(p_payload->'materials')
          ));

  return jsonb_build_object('batch_id', v_batch, 'batch_code', v_code, 'cogs_per_unit', v_cogs);
end $$;

-- register_business is called before any session exists, so anon must reach it.
grant execute on function register_business(text, text, text, text) to anon, authenticated, service_role;
grant execute on function checkout_pos(jsonb) to authenticated, service_role;
