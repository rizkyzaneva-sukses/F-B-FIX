do $$ begin
  create type capital_entry_type as enum ('INITIAL', 'ADDITION', 'WITHDRAWAL');
exception when duplicate_object then null; end $$;
do $$ begin
  create type expense_type as enum ('OPERATING', 'OWNER_WITHDRAWAL');
exception when duplicate_object then null; end $$;

create table if not exists capital_entries (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade,
  entry_type capital_entry_type not null, amount numeric(15,2) not null check (amount > 0), entry_date date not null,
  notes text not null default '', created_by uuid not null references app_users(id), created_at timestamptz not null default now()
);
create table if not exists payables (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade,
  transaction_id uuid not null unique references transactions(id) on delete cascade, supplier_id uuid not null references parties(id),
  amount numeric(15,2) not null check (amount > 0), paid_amount numeric(15,2) not null default 0 check (paid_amount >= 0),
  due_date date, status payment_status not null default 'BELUM_LUNAS', updated_at timestamptz not null default now()
);
create table if not exists payable_payments (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade,
  payable_id uuid not null references payables(id) on delete cascade, amount numeric(15,2) not null check (amount > 0),
  payment_method payment_method not null, payment_date timestamptz not null default now(), created_by uuid not null references app_users(id)
);
alter table expenses add column if not exists expense_type expense_type not null default 'OPERATING';
create index if not exists idx_capital_entries_business_date on capital_entries (business_id, entry_date desc);
create index if not exists idx_payables_business_status on payables (business_id, status);
grant select, insert, update, delete on capital_entries, payables, payable_payments to anon, authenticated, service_role;
alter table capital_entries enable row level security;
alter table payables enable row level security;
alter table payable_payments enable row level security;
do $$ declare t text; begin
  foreach t in array array['capital_entries','payables','payable_payments'] loop
    execute format('drop policy if exists tenant_select on %I', t);
    execute format('drop policy if exists tenant_write on %I', t);
    execute format('create policy tenant_select on %I for select using (is_service() or business_id = current_business_id())', t);
    execute format('create policy tenant_write on %I for all using (is_service() or (business_id = current_business_id() and request_claim(''role'') = ''OWNER'')) with check (is_service() or business_id = current_business_id())', t);
  end loop;
end $$;

create or replace function create_purchase(p_payload jsonb) returns jsonb language plpgsql as $$
declare v_business uuid := current_business_id(); v_user uuid := current_user_id(); v_line jsonb; v_item items%rowtype; v_total numeric := 0; v_paid numeric := greatest(0, coalesce((p_payload->>'paid_amount')::numeric, 0)); v_tx uuid; v_payable uuid; v_status payment_status;
begin
  if nullif(p_payload->>'supplier_id', '') is null or jsonb_array_length(coalesce(p_payload->'items', '[]'::jsonb)) = 0 then raise exception using errcode = '22023', message = 'Supplier dan minimal satu bahan wajib diisi'; end if;
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item from items where id = (v_line->>'item_id')::uuid and business_id = v_business and item_type = 'RAW_MATERIAL' for update;
    if not found or (v_line->>'qty')::numeric <= 0 or (v_line->>'price')::numeric < 0 then raise exception using errcode = '22023', message = 'Detail pembelian tidak valid'; end if;
    v_total := v_total + (v_line->>'qty')::numeric * (v_line->>'price')::numeric;
  end loop;
  if p_payload->>'payment_status' = 'LUNAS' and p_payload->>'paid_amount' is null then v_paid := v_total; end if;
  if v_paid > v_total then raise exception using errcode = '22023', message = 'Pembayaran awal melebihi total pembelian'; end if;
  v_status := case when v_paid >= v_total then 'LUNAS' when v_paid > 0 then 'SEBAGIAN' else 'BELUM_LUNAS' end;
  insert into transactions (business_id, party_id, created_by, transaction_type, payment_method, payment_status, subtotal, total, paid_amount, occurred_at)
    values (v_business, (p_payload->>'supplier_id')::uuid, v_user, 'PURCHASE', nullif(p_payload->>'payment_method','')::payment_method, v_status, v_total, v_total, v_paid, coalesce((p_payload->>'occurred_at')::timestamptz, now())) returning id into v_tx;
  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    select * into v_item from items where id = (v_line->>'item_id')::uuid;
    insert into transaction_items (business_id, transaction_id, item_id, qty, unit_price, subtotal) values (v_business, v_tx, v_item.id, (v_line->>'qty')::numeric, (v_line->>'price')::numeric, (v_line->>'qty')::numeric * (v_line->>'price')::numeric);
    update items set stock_qty = stock_qty + (v_line->>'qty')::numeric, last_buy_price = (v_line->>'price')::numeric where id = v_item.id;
  end loop;
  if v_paid < v_total then insert into payables (business_id, transaction_id, supplier_id, amount, paid_amount, status, due_date) values (v_business, v_tx, (p_payload->>'supplier_id')::uuid, v_total, v_paid, v_status, nullif(p_payload->>'due_date','')::date) returning id into v_payable; end if;
  return jsonb_build_object('transaction_id', v_tx, 'payable_id', v_payable, 'total', v_total, 'paid_amount', v_paid, 'status', v_status);
end $$;

create or replace function pay_payable(p_payable_id uuid, p_amount numeric, p_method payment_method) returns jsonb language plpgsql as $$
declare p payables%rowtype; v_remaining numeric; v_status payment_status;
begin
  select * into p from payables where id = p_payable_id and business_id = current_business_id() for update;
  if not found or p_amount <= 0 then raise exception using errcode = '22023', message = 'Utang atau nominal tidak valid'; end if;
  v_remaining := p.amount - p.paid_amount;
  if p_amount > v_remaining then raise exception using errcode = '22023', message = 'Pembayaran melebihi sisa utang'; end if;
  v_status := case when p.paid_amount + p_amount >= p.amount then 'LUNAS' when p.paid_amount + p_amount > 0 then 'SEBAGIAN' else 'BELUM_LUNAS' end;
  update payables set paid_amount = paid_amount + p_amount, status = v_status, updated_at = now() where id = p.id;
  update transactions set paid_amount = paid_amount + p_amount, payment_status = v_status where id = p.transaction_id;
  insert into payable_payments (business_id, payable_id, amount, payment_method, created_by) values (current_business_id(), p.id, p_amount, p_method, current_user_id());
  return jsonb_build_object('remaining_balance', v_remaining - p_amount, 'status', v_status);
end $$;
