-- B2B Module: Sales Orders, Delivery Orders, Invoices, Aging
-- Migration 012

-- Enums for B2B module
do $$ begin create type so_status as enum ('DRAFT', 'CONFIRMED', 'DELIVERED', 'INVOICED', 'CANCELLED'); exception when duplicate_object then null; end $$;
do $$ begin create type do_status as enum ('PENDING', 'DELIVERED'); exception when duplicate_object then null; end $$;
do $$ begin create type invoice_status as enum ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'); exception when duplicate_object then null; end $$;

-- Sales Orders
create table if not exists sales_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references parties(id),
  order_date date not null default current_date,
  status so_status not null default 'DRAFT',
  payment_terms_days integer not null default 30 check (payment_terms_days in (30, 60, 90)),
  total_amount numeric(15,2) not null default 0,
  notes text not null default '',
  created_by uuid not null references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sales Order Items
create table if not exists sales_order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sales_order_id uuid not null references sales_orders(id) on delete cascade,
  item_id uuid not null references items(id),
  qty numeric(15,2) not null check (qty > 0),
  unit_price numeric(15,2) not null default 0 check (unit_price >= 0),
  subtotal numeric(15,2) not null default 0
);

-- Delivery Orders (Surat Jalan)
create table if not exists delivery_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sales_order_id uuid not null references sales_orders(id) on delete cascade,
  delivery_date date not null default current_date,
  status do_status not null default 'PENDING',
  notes text not null default '',
  driver_name text not null default '',
  created_by uuid not null references app_users(id),
  created_at timestamptz not null default now()
);

-- Delivery Order Items
create table if not exists delivery_order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  delivery_order_id uuid not null references delivery_orders(id) on delete cascade,
  item_id uuid not null references items(id),
  qty numeric(15,2) not null check (qty > 0)
);

-- Invoices
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sales_order_id uuid not null references sales_orders(id),
  delivery_order_id uuid references delivery_orders(id),
  invoice_number text not null,
  invoice_date date not null default current_date,
  due_date date not null,
  total_amount numeric(15,2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(15,2) not null default 0 check (paid_amount >= 0),
  status invoice_status not null default 'UNPAID',
  notes text not null default '',
  created_by uuid not null references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, invoice_number)
);

-- Invoice Payments (partial payments)
create table if not exists invoice_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  payment_date timestamptz not null default now(),
  amount numeric(15,2) not null check (amount > 0),
  payment_method payment_method not null default 'TUNAI',
  notes text not null default '',
  created_by uuid not null references app_users(id)
);

-- Indexes
create index if not exists idx_sales_orders_business_status on sales_orders (business_id, status);
create index if not exists idx_sales_orders_business_date on sales_orders (business_id, order_date desc);
create index if not exists idx_sales_order_items_so on sales_order_items (sales_order_id);
create index if not exists idx_delivery_orders_so on delivery_orders (sales_order_id);
create index if not exists idx_delivery_order_items_do on delivery_order_items (delivery_order_id);
create index if not exists idx_invoices_business_status on invoices (business_id, status);
create index if not exists idx_invoices_business_date on invoices (business_id, invoice_date desc);
create index if not exists idx_invoice_payments_invoice on invoice_payments (invoice_id);

-- Grants
grant select, insert, update, delete on sales_orders, sales_order_items, delivery_orders, delivery_order_items, invoices, invoice_payments to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- RLS
alter table sales_orders enable row level security;
alter table sales_order_items enable row level security;
alter table delivery_orders enable row level security;
alter table delivery_order_items enable row level security;
alter table invoices enable row level security;
alter table invoice_payments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['sales_orders','sales_order_items','delivery_orders','delivery_order_items','invoices','invoice_payments'] loop
    execute format('drop policy if exists tenant_select on %I', t);
    execute format('drop policy if exists tenant_write on %I', t);
    execute format('create policy tenant_select on %I for select using (is_service() or business_id = current_business_id())', t);
    execute format('create policy tenant_write on %I for all using (is_service() or (business_id = current_business_id() and request_claim(''role'') = ''OWNER'')) with check (is_service() or business_id = current_business_id())', t);
  end loop;
end $$;

-- RPC: Create Sales Order with items
create or replace function create_sales_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_business_id uuid := current_business_id();
  v_user_id uuid := current_user_id();
  v_so_id uuid;
  v_item jsonb;
  v_total numeric(15,2) := 0;
  v_result jsonb;
begin
  -- Insert sales order
  insert into sales_orders (business_id, customer_id, order_date, status, payment_terms_days, notes, created_by)
  values (
    v_business_id,
    (p_payload->>'customer_id')::uuid,
    coalesce((p_payload->>'order_date')::date, current_date),
    'DRAFT',
    coalesce((p_payload->>'payment_terms_days')::integer, 30),
    coalesce(p_payload->>'notes', ''),
    v_user_id
  )
  returning id into v_so_id;

  -- Insert items
  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    insert into sales_order_items (business_id, sales_order_id, item_id, qty, unit_price, subtotal)
    values (
      v_business_id,
      v_so_id,
      (v_item->>'item_id')::uuid,
      (v_item->>'qty')::numeric,
      (v_item->>'unit_price')::numeric,
      (v_item->>'qty')::numeric * (v_item->>'unit_price')::numeric
    );
    v_total := v_total + (v_item->>'qty')::numeric * (v_item->>'unit_price')::numeric;
  end loop;

  -- Update total
  update sales_orders set total_amount = v_total where id = v_so_id;

  select jsonb_build_object('id', so.id, 'total_amount', so.total_amount)
  into v_result
  from sales_orders so
  where so.id = v_so_id;

  return v_result;
end;
$$;

-- RPC: Update SO status
create or replace function update_so_status(p_so_id uuid, p_status text)
returns void
language plpgsql
security definer
as $$
declare
  v_business_id uuid := current_business_id();
begin
  update sales_orders
  set status = p_status::so_status, updated_at = now()
  where id = p_so_id and business_id = v_business_id;
end;
$$;

-- RPC: Create Delivery Order from SO
create or replace function create_delivery_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_business_id uuid := current_business_id();
  v_user_id uuid := current_user_id();
  v_do_id uuid;
  v_item jsonb;
  v_result jsonb;
begin
  insert into delivery_orders (business_id, sales_order_id, delivery_date, status, notes, driver_name, created_by)
  values (
    v_business_id,
    (p_payload->>'sales_order_id')::uuid,
    coalesce((p_payload->>'delivery_date')::date, current_date),
    'PENDING',
    coalesce(p_payload->>'notes', ''),
    coalesce(p_payload->>'driver_name', ''),
    v_user_id
  )
  returning id into v_do_id;

  -- Copy items from SO if not provided
  if p_payload ? 'items' then
    for v_item in select * from jsonb_array_elements(p_payload->'items')
    loop
      insert into delivery_order_items (business_id, delivery_order_id, item_id, qty)
      values (v_business_id, v_do_id, (v_item->>'item_id')::uuid, (v_item->>'qty')::numeric);
    end loop;
  else
    insert into delivery_order_items (business_id, delivery_order_id, item_id, qty)
    select v_business_id, v_do_id, soi.item_id, soi.qty
    from sales_order_items soi
    where soi.sales_order_id = (p_payload->>'sales_order_id')::uuid;
  end if;

  select jsonb_build_object('id', d.id) into v_result
  from delivery_orders d where d.id = v_do_id;

  return v_result;
end;
$$;

-- RPC: Create Invoice from SO
create or replace function create_invoice(p_payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_business_id uuid := current_business_id();
  v_user_id uuid := current_user_id();
  v_invoice_id uuid;
  v_so_id uuid := (p_payload->>'sales_order_id')::uuid;
  v_terms integer;
  v_order_date date;
  v_total numeric(15,2);
  v_invoice_number text;
  v_due_date date;
  v_result jsonb;
begin
  -- Get SO details
  select payment_terms_days, order_date, total_amount
  into v_terms, v_order_date, v_total
  from sales_orders
  where id = v_so_id and business_id = v_business_id;

  if v_so_id is null then
    raise exception 'Sales order not found';
  end if;

  v_due_date := coalesce((p_payload->>'due_date')::date, current_date + (v_terms || ' days')::interval);

  -- Generate invoice number
  v_invoice_number := 'INV-' || to_char(current_date, 'YYMMDD') || '-' || lpad(
    (select coalesce(max(split_part(invoice_number, '-', 3)::int), 0) + 1
     from invoices where business_id = v_business_id and invoice_number like 'INV-' || to_char(current_date, 'YYMMDD') || '-%')::text,
    3, '0'
  );

  insert into invoices (business_id, sales_order_id, delivery_order_id, invoice_number, invoice_date, due_date, total_amount, notes, created_by)
  values (
    v_business_id,
    v_so_id,
    (p_payload->>'delivery_order_id')::uuid,
    v_invoice_number,
    coalesce((p_payload->>'invoice_date')::date, current_date),
    v_due_date,
    coalesce((p_payload->>'total_amount')::numeric, v_total),
    coalesce(p_payload->>'notes', ''),
    v_user_id
  )
  returning id into v_invoice_id;

  -- Update SO status to INVOICED
  update sales_orders set status = 'INVOICED', updated_at = now() where id = v_so_id;

  select jsonb_build_object('id', i.id, 'invoice_number', i.invoice_number, 'due_date', i.due_date, 'total_amount', i.total_amount)
  into v_result
  from invoices i where i.id = v_invoice_id;

  return v_result;
end;
$$;

-- RPC: Record Invoice Payment
create or replace function pay_invoice(p_invoice_id uuid, p_amount numeric, p_method text, p_notes text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_business_id uuid := current_business_id();
  v_user_id uuid := current_user_id();
  v_current_paid numeric(15,2);
  v_total numeric(15,2);
  v_new_paid numeric(15,2);
  v_new_status invoice_status;
  v_result jsonb;
begin
  select paid_amount, total_amount into v_current_paid, v_total
  from invoices where id = p_invoice_id and business_id = v_business_id;

  if v_total is null then
    raise exception 'Invoice not found';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;

  -- Insert payment record
  insert into invoice_payments (business_id, invoice_id, amount, payment_method, notes, created_by)
  values (v_business_id, p_invoice_id, p_amount, p_method::payment_method, coalesce(p_notes, ''), v_user_id);

  v_new_paid := v_current_paid + p_amount;

  if v_new_paid >= v_total then
    v_new_status := 'PAID';
  else
    v_new_status := 'PARTIAL';
  end if;

  update invoices
  set paid_amount = v_new_paid, status = v_new_status, updated_at = now()
  where id = p_invoice_id;

  select jsonb_build_object('id', i.id, 'paid_amount', i.paid_amount, 'status', i.status)
  into v_result
  from invoices i where i.id = p_invoice_id;

  return v_result;
end;
$$;

-- RPC: Aging Report
create or replace function get_aging_report()
returns table (
  invoice_id uuid,
  invoice_number text,
  customer_name text,
  invoice_date date,
  due_date date,
  total_amount numeric,
  paid_amount numeric,
  outstanding numeric,
  days_overdue integer,
  age_bucket text
)
language plpgsql
security definer
as $$
begin
  return query
  select
    i.id as invoice_id,
    i.invoice_number,
    p.name as customer_name,
    i.invoice_date,
    i.due_date,
    i.total_amount,
    i.paid_amount,
    (i.total_amount - i.paid_amount) as outstanding,
    greatest(0, (current_date - i.due_date)::integer) as days_overdue,
    case
      when (current_date - i.due_date) <= 30 then '0-30'
      when (current_date - i.due_date) <= 60 then '31-60'
      when (current_date - i.due_date) <= 90 then '61-90'
      else '>90'
    end as age_bucket
  from invoices i
  join sales_orders so on so.id = i.sales_order_id
  join parties p on p.id = so.customer_id
  where i.business_id = current_business_id()
    and i.status in ('UNPAID', 'PARTIAL', 'OVERDUE')
  order by i.due_date asc;
end;
$$;
