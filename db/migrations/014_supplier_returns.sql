-- Migration 014: Supplier Returns (Retur ke Supplier)
create table if not exists supplier_returns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  purchase_id uuid not null references transactions(id) on delete cascade,
  supplier_id uuid not null references parties(id) on delete cascade,
  return_date date not null default current_date,
  reason text not null default '',
  total numeric(15,2) not null default 0 check (total >= 0),
  notes text not null default '',
  created_by uuid references app_users(id),
  created_at timestamptz not null default now()
);

alter table supplier_returns enable row level security;
create policy tenant_read on supplier_returns for select using (business_id = current_business_id());
create policy tenant_write on supplier_returns for insert with check (business_id = current_business_id() and request_claim('role') = 'OWNER');

create table if not exists supplier_return_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  return_id uuid not null references supplier_returns(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  qty numeric(15,2) not null check (qty > 0),
  unit_price numeric(15,2) not null check (unit_price >= 0),
  subtotal numeric(15,2) not null check (subtotal >= 0)
);

alter table supplier_return_items enable row level security;
create policy tenant_read on supplier_return_items for select using (business_id = current_business_id());
create policy tenant_write on supplier_return_items for insert with check (business_id = current_business_id() and request_claim('role') = 'OWNER');

create or replace function record_supplier_return(p_payload jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_business uuid := current_business_id();
  v_user uuid := current_user_id();
  v_return_id uuid;
  v_line jsonb;
  v_item items%rowtype;
  v_total numeric(15,2) := 0;
  v_purchase_id uuid := (p_payload->>'purchase_id')::uuid;
  v_supplier_id uuid := (p_payload->>'supplier_id')::uuid;
  v_reason text := coalesce(p_payload->>'reason', 'Return barang');
  v_notes text := coalesce(p_payload->>'notes', '');
begin
  if v_business is null or v_user is null then raise exception using errcode = '42501', message = 'Sesi tidak valid'; end if;
  if request_claim('role') <> 'OWNER' then raise exception using errcode = '42501', message = 'Hanya owner yang bisa mencatat retur'; end if;
  if v_purchase_id is null then raise exception using errcode = '22023', message = 'ID pembelian wajib diisi'; end if;
  if not exists (select 1 from transactions where id = v_purchase_id and business_id = v_business and transaction_type = 'PURCHASE') then raise exception using errcode = '22023', message = 'Pembelian tidak ditemukan'; end if;
  if jsonb_array_length(coalesce(p_payload->'items', '[]'::jsonb)) = 0 then raise exception using errcode = '22023', message = 'Minimal satu item retur wajib diisi'; end if;
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item from items where id = (v_line->>'item_id')::uuid and business_id = v_business and item_type = 'RAW_MATERIAL' for update;
    if not found or (v_line->>'qty')::numeric <= 0 then raise exception using errcode = '22023', message = 'Item retur tidak valid'; end if;
    v_total := v_total + (v_line->>'qty')::numeric * coalesce((v_line->>'unit_price')::numeric, v_item.last_buy_price);
  end loop;
  insert into supplier_returns (business_id, purchase_id, supplier_id, return_date, reason, total, notes, created_by)
  values (v_business, v_purchase_id, v_supplier_id, current_date, v_reason, v_total, v_notes, v_user) returning id into v_return_id;
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item from items where id = (v_line->>'item_id')::uuid for update;
    insert into supplier_return_items (business_id, return_id, item_id, qty, unit_price, subtotal)
    values (v_business, v_return_id, v_item.id, (v_line->>'qty')::numeric, coalesce((v_line->>'unit_price')::numeric, v_item.last_buy_price), (v_line->>'qty')::numeric * coalesce((v_line->>'unit_price')::numeric, v_item.last_buy_price));
    update items set stock_qty = stock_qty - (v_line->>'qty')::numeric where id = v_item.id;
  end loop;
  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  values (v_business, v_user, 'supplier_return_created', 'supplier_return', v_return_id, jsonb_build_object('purchase_id', v_purchase_id, 'total', v_total, 'item_count', jsonb_array_length(p_payload->'items')));
  return jsonb_build_object('return_id', v_return_id, 'total', v_total);
end $$;
grant execute on function record_supplier_return(jsonb) to authenticated, service_role;
