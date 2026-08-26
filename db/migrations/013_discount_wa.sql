-- Migration 013: Discount at POS

create or replace function checkout_pos(p_payload jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_business uuid := current_business_id(); v_user uuid := current_user_id();
  v_role text := request_claim('role'); v_tx uuid;
  v_method payment_method := (p_payload->>'payment_method')::payment_method;
  v_subtotal numeric(15,2) := 0;
  v_discount numeric(15,2) := greatest(0, coalesce((p_payload->>'discount')::numeric, 0));
  v_total numeric(15,2) := 0;
  v_count integer; v_limit integer; v_plan plan_type; v_line jsonb; v_item items%rowtype; v_qty numeric;
  v_party uuid := nullif(p_payload->>'party_id', '')::uuid;
  v_override_reason text := nullif(p_payload->>'override_reason', '');
begin
  if v_business is null or v_user is null then raise exception using errcode = '42501', message = 'Sesi tidak valid'; end if;
  if v_role not in ('OWNER', 'KASIR') then raise exception using errcode = '42501', message = 'Peran tidak berhak melakukan transaksi'; end if;
  if not exists (select 1 from app_users where id = v_user and business_id = v_business and is_active) then raise exception using errcode = '42501', message = 'Pengguna tidak terdaftar pada bisnis ini'; end if;
  select plan, sales_transaction_limit into v_plan, v_limit from businesses where id = v_business;
  if not found then raise exception using errcode = '42501', message = 'Bisnis tidak ditemukan'; end if;
  select count(*) into v_count from transactions where business_id = v_business and transaction_type = 'SALE' and occurred_at >= date_trunc('month', now());
  if v_plan = 'FREE' and v_count >= v_limit then raise exception using errcode = 'P0001', message = format('Batas %s transaksi bulan ini telah tercapai. Upgrade ke PRO untuk melanjutkan.', v_limit); end if;
  if jsonb_array_length(coalesce(p_payload->'items', '[]'::jsonb)) = 0 then raise exception using errcode = '22023', message = 'Keranjang kosong'; end if;
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item from items where id = (v_line->>'item_id')::uuid and business_id = v_business and item_type = 'PRODUCT' and is_active = true for update;
    if not found then raise exception using errcode = 'P0002', message = 'Produk tidak ditemukan'; end if;
    v_qty := (v_line->>'qty')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception using errcode = '22023', message = 'Kuantitas produk tidak valid'; end if;
    if v_item.track_stock and v_item.stock_qty < v_qty then
      if v_role <> 'OWNER' or v_override_reason is null or length(trim(v_override_reason)) < 5 then
        raise exception using errcode = 'P0003', message = format('Stok %s tidak mencukupi. Tersedia: %s.', v_item.name, v_item.stock_qty);
      end if;
    end if;
    v_subtotal := v_subtotal + v_qty * coalesce((v_line->>'unit_price')::numeric, v_item.sale_price);
  end loop;
  if v_discount > v_subtotal then raise exception using errcode = '22023', message = 'Diskon tidak boleh melebihi subtotal'; end if;
  v_total := v_subtotal - v_discount;
  if v_method = 'HUTANG' then
    if v_party is null or nullif(p_payload->>'due_date', '') is null then raise exception using errcode = '22023', message = 'Pelanggan dan jatuh tempo wajib diisi'; end if;
    if not exists (select 1 from parties where id = v_party and business_id = v_business and party_type = 'CUSTOMER' and is_active) then raise exception using errcode = '22023', message = 'Pelanggan tidak ditemukan'; end if;
    if (select credit_limit from parties where id = v_party and business_id = v_business) > 0 and v_total + coalesce((select sum(amount - paid_amount) from receivables where customer_id = v_party and business_id = v_business), 0) > (select credit_limit from parties where id = v_party and business_id = v_business) then raise exception using errcode = '22023', message = 'Total penjualan melebihi limit piutang pelanggan'; end if;
  end if;
  if v_method = 'TUNAI' and coalesce((p_payload->>'paid_amount')::numeric, 0) < v_total then raise exception using errcode = '22023', message = 'Nominal tunai kurang dari total'; end if;
  insert into transactions (business_id, party_id, created_by, transaction_type, payment_method, payment_status, subtotal, discount, total, paid_amount, change_amount, override_reason)
  values (v_business, v_party, v_user, 'SALE', v_method, case when v_method = 'HUTANG' then 'BELUM_LUNAS' else 'LUNAS' end, v_subtotal, v_discount, v_total, case when v_method = 'HUTANG' then 0 else (p_payload->>'paid_amount')::numeric end, case when v_method = 'TUNAI' then (p_payload->>'paid_amount')::numeric - v_total else 0 end, v_override_reason) returning id into v_tx;
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item from items where id = (v_line->>'item_id')::uuid and business_id = v_business for update;
    v_qty := (v_line->>'qty')::numeric;
    insert into transaction_items (business_id, transaction_id, item_id, qty, unit_price, subtotal, cogs_at_sale) values (v_business, v_tx, v_item.id, v_qty, coalesce((v_line->>'unit_price')::numeric, v_item.sale_price), v_qty * coalesce((v_line->>'unit_price')::numeric, v_item.sale_price), v_item.last_cogs);
    if v_item.track_stock then update items set stock_qty = stock_qty - v_qty where id = v_item.id; end if;
  end loop;
  if v_method = 'HUTANG' then insert into receivables (business_id, transaction_id, customer_id, amount, due_date) values (v_business, v_tx, v_party, v_total, (p_payload->>'due_date')::date); end if;
  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata) values (v_business, v_user, 'pos_sale_completed', 'transaction', v_tx, jsonb_build_object('subtotal', v_subtotal, 'discount', v_discount, 'total', v_total, 'method', v_method, 'item_count', jsonb_array_length(p_payload->'items'), 'override', v_override_reason is not null, 'role', v_role));
  return jsonb_build_object('transaction_id', v_tx, 'subtotal', v_subtotal, 'discount', v_discount, 'total', v_total, 'change_amount', case when v_method = 'TUNAI' then (p_payload->>'paid_amount')::numeric - v_total else 0 end);
end $$;

grant execute on function checkout_pos(jsonb) to authenticated, service_role;

create index if not exists idx_parties_phone on parties(phone) where phone <> '';
