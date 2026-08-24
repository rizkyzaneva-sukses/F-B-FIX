create extension if not exists pgcrypto;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
grant anon, authenticated, service_role to dapurkasir;
grant usage on schema public to anon, authenticated, service_role;

do $$ begin
  create type plan_type as enum ('FREE', 'PRO');
exception when duplicate_object then null; end $$;
do $$ begin
  create type user_role as enum ('OWNER', 'KASIR');
exception when duplicate_object then null; end $$;
do $$ begin
  create type item_type as enum ('PRODUCT', 'RAW_MATERIAL');
exception when duplicate_object then null; end $$;
do $$ begin
  create type party_type as enum ('SUPPLIER', 'CUSTOMER');
exception when duplicate_object then null; end $$;
do $$ begin
  create type transaction_type as enum ('SALE', 'PURCHASE', 'EXPENSE');
exception when duplicate_object then null; end $$;
do $$ begin
  create type payment_method as enum ('TUNAI', 'QRIS', 'TRANSFER', 'HUTANG');
exception when duplicate_object then null; end $$;
do $$ begin
  create type payment_status as enum ('LUNAS', 'SEBAGIAN', 'BELUM_LUNAS');
exception when duplicate_object then null; end $$;

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  address text not null default '', phone text not null default '',
  receipt_footer text not null default 'Terima kasih sudah mendukung usaha lokal.',
  paper_width integer not null default 58 check (paper_width in (58, 80)),
  plan plan_type not null default 'FREE', sales_transaction_limit integer not null default 50,
  product_limit integer not null default 30, raw_material_limit integer not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade,
  email text, name text not null, password_hash text, pin_hash text,
  role user_role not null default 'OWNER', is_active boolean not null default true, created_at timestamptz not null default now(),
  unique (business_id, email)
);

create table if not exists units (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade,
  code text not null, label text not null, is_locked boolean not null default false,
  unique (business_id, code)
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade,
  unit_id uuid not null references units(id), item_type item_type not null, name text not null,
  category text not null default 'Lainnya', sale_price numeric(15,2) not null default 0 check (sale_price >= 0),
  stock_qty numeric(15,2) not null default 0 check (stock_qty >= 0 or item_type = 'PRODUCT'),
  last_buy_price numeric(15,2) not null default 0 check (last_buy_price >= 0), last_cogs numeric(15,2) not null default 0,
  track_stock boolean not null default true, is_active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists parties (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade,
  party_type party_type not null, name text not null, phone text not null default '', address text not null default '',
  credit_limit numeric(15,2) not null default 0 check (credit_limit >= 0), is_active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade,
  party_id uuid references parties(id), created_by uuid not null references app_users(id), transaction_type transaction_type not null,
  payment_method payment_method, payment_status payment_status not null default 'LUNAS', subtotal numeric(15,2) not null default 0,
  discount numeric(15,2) not null default 0, total numeric(15,2) not null default 0, paid_amount numeric(15,2) not null default 0,
  change_amount numeric(15,2) not null default 0, override_reason text, occurred_at timestamptz not null default now()
);

create table if not exists transaction_items (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade, transaction_id uuid not null references transactions(id) on delete cascade,
  item_id uuid not null references items(id), qty numeric(15,2) not null check (qty > 0), unit_price numeric(15,2) not null default 0,
  subtotal numeric(15,2) not null default 0, cogs_at_sale numeric(15,2) not null default 0
);

create table if not exists production_batches (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade,
  output_item_id uuid not null references items(id), batch_code text not null, output_qty numeric(15,2) not null check (output_qty > 0),
  material_cost numeric(15,2) not null default 0, other_cost numeric(15,2) not null default 0, cogs_per_unit numeric(15,2) not null default 0,
  status text not null default 'COMPLETED' check (status in ('COMPLETED', 'CANCELLED')), produced_at timestamptz not null default now(), created_by uuid not null references app_users(id),
  unique (business_id, batch_code)
);

create table if not exists production_materials (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade, batch_id uuid not null references production_batches(id) on delete cascade,
  item_id uuid not null references items(id), qty_used numeric(15,2) not null check (qty_used > 0), unit_cost numeric(15,2) not null default 0, total_cost numeric(15,2) not null default 0
);

create table if not exists receivables (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade,
  transaction_id uuid not null unique references transactions(id), customer_id uuid not null references parties(id), amount numeric(15,2) not null check (amount > 0),
  paid_amount numeric(15,2) not null default 0 check (paid_amount >= 0), due_date date not null, status payment_status not null default 'BELUM_LUNAS', updated_at timestamptz not null default now()
);

create table if not exists receivable_payments (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade, receivable_id uuid not null references receivables(id) on delete cascade,
  amount numeric(15,2) not null check (amount > 0), payment_method payment_method not null, payment_date timestamptz not null default now(), created_by uuid not null references app_users(id)
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade,
  category text not null, amount numeric(15,2) not null check (amount > 0), expense_date date not null, notes text not null default '', attachment_url text, created_by uuid not null references app_users(id), created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id bigint generated always as identity primary key, business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid references app_users(id), action text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

create index if not exists idx_items_business_active on items (business_id, item_type, is_active);
create index if not exists idx_transactions_business_date on transactions (business_id, occurred_at desc);
create index if not exists idx_receivables_business_status on receivables (business_id, status);
create index if not exists idx_expenses_business_date on expenses (business_id, expense_date desc);
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

create or replace function request_claim(name text) returns text language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> name, '')
$$;
create or replace function check_request() returns void language plpgsql as $$
begin
  if request_claim('role') = '' then raise exception using errcode = '42501', message = 'JWT diperlukan'; end if;
end $$;
create or replace function current_business_id() returns uuid language sql stable as $$
  select nullif(request_claim('business_id'), '')::uuid
$$;
create or replace function current_user_id() returns uuid language sql stable as $$
  select nullif(request_claim('user_id'), '')::uuid
$$;
create or replace function is_service() returns boolean language sql stable as $$
  select request_claim('role') in ('service_role', 'admin')
$$;

alter table businesses enable row level security;
alter table app_users enable row level security;
alter table units enable row level security;
alter table items enable row level security;
alter table parties enable row level security;
alter table transactions enable row level security;
alter table transaction_items enable row level security;
alter table production_batches enable row level security;
alter table production_materials enable row level security;
alter table receivables enable row level security;
alter table receivable_payments enable row level security;
alter table expenses enable row level security;
alter table audit_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['businesses','app_users','units','items','parties','transactions','transaction_items','production_batches','production_materials','receivables','receivable_payments','expenses','audit_logs'] loop
    execute format('drop policy if exists tenant_select on %I', t);
    execute format('drop policy if exists tenant_write on %I', t);
    if t = 'businesses' then
      execute format('create policy tenant_select on %I for select using (is_service() or id = current_business_id())', t);
      execute format('create policy tenant_write on %I for all using (is_service() or (id = current_business_id() and request_claim(''role'') = ''OWNER'')) with check (is_service() or id = current_business_id())', t);
    else
      execute format('create policy tenant_select on %I for select using (is_service() or business_id = current_business_id())', t);
      execute format('create policy tenant_write on %I for all using (is_service() or (business_id = current_business_id() and request_claim(''role'') = ''OWNER'')) with check (is_service() or business_id = current_business_id())', t);
    end if;
  end loop;
end $$;

create or replace function seed_default_units(p_business_id uuid) returns void language plpgsql security definer as $$
begin
  insert into units (business_id, code, label, is_locked) values
    (p_business_id, 'g', 'Gram', true), (p_business_id, 'kg', 'Kilogram', true), (p_business_id, 'ml', 'Mililiter', true),
    (p_business_id, 'liter', 'Liter', true), (p_business_id, 'pcs', 'Pieces', true), (p_business_id, 'botol', 'Botol', true), (p_business_id, 'jar', 'Jar', true)
  on conflict (business_id, code) do nothing;
end $$;

create or replace function deduct_stock(p_item_id uuid, p_qty numeric, p_allow_negative boolean default false) returns boolean language plpgsql as $$
begin
  if p_qty <= 0 then raise exception using errcode = '22023', message = 'Kuantitas harus lebih besar dari 0'; end if;
  update items set stock_qty = stock_qty - p_qty where id = p_item_id and business_id = current_business_id() and (not track_stock or p_allow_negative or stock_qty >= p_qty);
  return found;
end $$;

create or replace function checkout_pos(p_payload jsonb) returns jsonb language plpgsql as $$
declare
  v_business uuid := current_business_id(); v_user uuid := current_user_id(); v_role text := request_claim('role'); v_tx uuid;
  v_method payment_method := (p_payload->>'payment_method')::payment_method; v_total numeric(15,2) := 0; v_count integer;
  v_line jsonb; v_item items%rowtype; v_qty numeric; v_party uuid := nullif(p_payload->>'party_id', '')::uuid;
begin
  if v_business is null or v_user is null then raise exception using errcode = '42501', message = 'Sesi tidak valid'; end if;
  select count(*) into v_count from transactions where business_id = v_business and transaction_type = 'SALE' and occurred_at >= date_trunc('month', now());
  if (select plan from businesses where id = v_business) = 'FREE' and v_count >= 50 then raise exception using errcode = 'P0001', message = 'Batas 50 transaksi bulan ini telah tercapai. Upgrade ke PRO untuk melanjutkan.'; end if;
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item from items where id = (v_line->>'item_id')::uuid and business_id = v_business and item_type = 'PRODUCT' and is_active = true for update;
    if not found then raise exception using errcode = 'P0002', message = 'Produk tidak ditemukan'; end if;
    v_qty := (v_line->>'qty')::numeric;
    if v_qty <= 0 then raise exception using errcode = '22023', message = 'Kuantitas produk tidak valid'; end if;
    if v_item.track_stock and v_item.stock_qty < v_qty and (v_role <> 'OWNER' or length(trim(coalesce(p_payload->>'override_reason', ''))) < 5) then raise exception using errcode = 'P0003', message = format('Stok %s tidak mencukupi. Tersedia: %s.', v_item.name, v_item.stock_qty); end if;
    v_total := v_total + v_qty * coalesce((v_line->>'unit_price')::numeric, v_item.sale_price);
  end loop;
  if jsonb_array_length(coalesce(p_payload->'items', '[]'::jsonb)) = 0 then raise exception using errcode = '22023', message = 'Keranjang kosong'; end if;
  if v_method = 'HUTANG' and (v_party is null or nullif(p_payload->>'due_date', '') is null) then raise exception using errcode = '22023', message = 'Pelanggan dan jatuh tempo wajib diisi'; end if;
  if v_method = 'HUTANG' and not exists (select 1 from parties where id = v_party and business_id = v_business and party_type = 'CUSTOMER' and is_active) then raise exception using errcode = '22023', message = 'Pelanggan tidak ditemukan'; end if;
  if v_method = 'HUTANG' and v_party is not null and (select credit_limit from parties where id = v_party and business_id = v_business) > 0 and
     v_total + coalesce((select sum(amount - paid_amount) from receivables where customer_id = v_party and business_id = v_business), 0) > (select credit_limit from parties where id = v_party and business_id = v_business)
  then raise exception using errcode = '22023', message = 'Total penjualan melebihi limit piutang pelanggan'; end if;
  if v_method = 'TUNAI' and (p_payload->>'paid_amount')::numeric < v_total then raise exception using errcode = '22023', message = 'Nominal tunai kurang dari total'; end if;
  insert into transactions (business_id, party_id, created_by, transaction_type, payment_method, payment_status, subtotal, total, paid_amount, change_amount, override_reason)
    values (v_business, v_party, v_user, 'SALE', v_method, case when v_method = 'HUTANG' then 'BELUM_LUNAS' else 'LUNAS' end, v_total, v_total, case when v_method = 'HUTANG' then 0 else (p_payload->>'paid_amount')::numeric end, case when v_method = 'TUNAI' then (p_payload->>'paid_amount')::numeric - v_total else 0 end, nullif(p_payload->>'override_reason', '')) returning id into v_tx;
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item from items where id = (v_line->>'item_id')::uuid for update;
    v_qty := (v_line->>'qty')::numeric;
    insert into transaction_items (business_id, transaction_id, item_id, qty, unit_price, subtotal, cogs_at_sale) values (v_business, v_tx, v_item.id, v_qty, coalesce((v_line->>'unit_price')::numeric, v_item.sale_price), v_qty * coalesce((v_line->>'unit_price')::numeric, v_item.sale_price), v_item.last_cogs);
    if v_item.track_stock then update items set stock_qty = stock_qty - v_qty where id = v_item.id; end if;
  end loop;
  if v_method = 'HUTANG' then insert into receivables (business_id, transaction_id, customer_id, amount, due_date) values (v_business, v_tx, v_party, v_total, (p_payload->>'due_date')::date); end if;
  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata) values (v_business, v_user, 'pos_sale_completed', 'transaction', v_tx, p_payload);
  return jsonb_build_object('transaction_id', v_tx, 'total', v_total, 'change_amount', case when v_method = 'TUNAI' then (p_payload->>'paid_amount')::numeric - v_total else 0 end);
end $$;

create or replace function pay_receivable(p_receivable_id uuid, p_amount numeric, p_method payment_method) returns jsonb language plpgsql as $$
declare r receivables%rowtype; v_remaining numeric;
begin
  select * into r from receivables where id = p_receivable_id and business_id = current_business_id() for update;
  if not found or p_amount <= 0 then raise exception using errcode = '22023', message = 'Piutang atau nominal tidak valid'; end if;
  v_remaining := r.amount - r.paid_amount;
  if p_amount > v_remaining then raise exception using errcode = '22023', message = 'Pembayaran melebihi sisa tagihan'; end if;
  update receivables set paid_amount = paid_amount + p_amount, status = case when paid_amount + p_amount >= amount then 'LUNAS' when paid_amount + p_amount > 0 then 'SEBAGIAN' else 'BELUM_LUNAS' end, updated_at = now() where id = r.id;
  insert into receivable_payments (business_id, receivable_id, amount, payment_method, created_by) values (current_business_id(), r.id, p_amount, p_method, current_user_id());
  return jsonb_build_object('remaining_balance', v_remaining - p_amount, 'status', case when v_remaining - p_amount = 0 then 'LUNAS' else 'SEBAGIAN' end);
end $$;

create or replace function create_production_batch(p_payload jsonb) returns jsonb language plpgsql as $$
declare v_business uuid := current_business_id(); v_user uuid := current_user_id(); v_output items%rowtype; v_material items%rowtype; v_line jsonb;
  v_output_qty numeric := (p_payload->>'output_qty')::numeric; v_other numeric := coalesce((p_payload->>'other_cost')::numeric, 0); v_material_cost numeric := 0; v_cogs numeric; v_batch uuid; v_code text;
begin
  select * into v_output from items where id = (p_payload->>'output_item_id')::uuid and business_id = v_business and item_type = 'PRODUCT' and is_active for update;
  if not found or v_output_qty <= 0 then raise exception using errcode = '22023', message = 'Produk output dan kuantitas wajib valid'; end if;
  if jsonb_array_length(coalesce(p_payload->'materials', '[]'::jsonb)) = 0 then raise exception using errcode = '22023', message = 'Minimal satu bahan baku wajib dipilih'; end if;
  for v_line in select * from jsonb_array_elements(p_payload->'materials') loop
    select * into v_material from items where id = (v_line->>'item_id')::uuid and business_id = v_business and item_type = 'RAW_MATERIAL' and is_active for update;
    if not found or (v_line->>'qty_used')::numeric <= 0 then raise exception using errcode = '22023', message = 'Bahan produksi tidak valid'; end if;
    if v_material.stock_qty < (v_line->>'qty_used')::numeric then raise exception using errcode = 'P0004', message = format('Stok bahan %s tidak mencukupi. Tersedia: %s %s.', v_material.name, v_material.stock_qty, (select code from units where id = v_material.unit_id)); end if;
    v_material_cost := v_material_cost + (v_line->>'qty_used')::numeric * v_material.last_buy_price;
  end loop;
  v_cogs := round((v_material_cost + greatest(v_other, 0)) / v_output_qty, 2);
  v_code := 'BATCH-' || to_char(now(), 'YYMMDD') || '-' || lpad((select count(*) + 1 from production_batches where business_id = v_business and produced_at::date = current_date)::text, 3, '0');
  insert into production_batches (business_id, output_item_id, batch_code, output_qty, material_cost, other_cost, cogs_per_unit, created_by) values (v_business, v_output.id, v_code, v_output_qty, round(v_material_cost, 2), round(greatest(v_other, 0), 2), v_cogs, v_user) returning id into v_batch;
  for v_line in select * from jsonb_array_elements(p_payload->'materials') loop
    select * into v_material from items where id = (v_line->>'item_id')::uuid;
    insert into production_materials (business_id, batch_id, item_id, qty_used, unit_cost, total_cost) values (v_business, v_batch, v_material.id, (v_line->>'qty_used')::numeric, v_material.last_buy_price, (v_line->>'qty_used')::numeric * v_material.last_buy_price);
    update items set stock_qty = stock_qty - (v_line->>'qty_used')::numeric where id = v_material.id;
  end loop;
  update items set stock_qty = stock_qty + v_output_qty, last_cogs = v_cogs where id = v_output.id;
  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata) values (v_business, v_user, 'production_batch_saved', 'production_batch', v_batch, p_payload);
  return jsonb_build_object('batch_id', v_batch, 'batch_code', v_code, 'cogs_per_unit', v_cogs);
end $$;

create or replace function create_purchase(p_payload jsonb) returns jsonb language plpgsql as $$
declare v_business uuid := current_business_id(); v_user uuid := current_user_id(); v_line jsonb; v_item items%rowtype; v_total numeric := 0; v_tx uuid; v_status payment_status := case when p_payload->>'payment_status' = 'UTANG' then 'BELUM_LUNAS' else 'LUNAS' end;
begin
  if nullif(p_payload->>'supplier_id', '') is null or jsonb_array_length(coalesce(p_payload->'items', '[]'::jsonb)) = 0 then raise exception using errcode = '22023', message = 'Supplier dan minimal satu bahan wajib diisi'; end if;
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item from items where id = (v_line->>'item_id')::uuid and business_id = v_business and item_type = 'RAW_MATERIAL' for update;
    if not found or (v_line->>'qty')::numeric <= 0 or (v_line->>'price')::numeric < 0 then raise exception using errcode = '22023', message = 'Detail pembelian tidak valid'; end if;
    v_total := v_total + (v_line->>'qty')::numeric * (v_line->>'price')::numeric;
  end loop;
  insert into transactions (business_id, party_id, created_by, transaction_type, payment_status, subtotal, total, paid_amount) values (v_business, (p_payload->>'supplier_id')::uuid, v_user, 'PURCHASE', v_status, v_total, v_total, case when v_status = 'LUNAS' then v_total else 0 end) returning id into v_tx;
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item from items where id = (v_line->>'item_id')::uuid;
    insert into transaction_items (business_id, transaction_id, item_id, qty, unit_price, subtotal) values (v_business, v_tx, v_item.id, (v_line->>'qty')::numeric, (v_line->>'price')::numeric, (v_line->>'qty')::numeric * (v_line->>'price')::numeric);
    update items set stock_qty = stock_qty + (v_line->>'qty')::numeric, last_buy_price = (v_line->>'price')::numeric where id = v_item.id;
  end loop;
  return jsonb_build_object('transaction_id', v_tx, 'total', v_total);
end $$;
