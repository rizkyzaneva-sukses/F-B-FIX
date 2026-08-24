-- Migration 008: Subscription and payment system

-- Subscription plans
do $$ begin
  create type subscription_status as enum ('ACTIVE', 'EXPIRED', 'CANCELLED', 'TRIAL');
exception when duplicate_object then null; end $$;

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  plan plan_type not null default 'FREE',
  status subscription_status not null default 'TRIAL',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  cancelled_at timestamptz,
  payment_gateway text default 'midtrans',
  gateway_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  subscription_id uuid references subscriptions(id),
  amount numeric(15,2) not null check (amount > 0),
  currency text not null default 'IDR',
  status text not null default 'PENDING' check (status in ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED')),
  payment_method text,
  gateway text not null default 'midtrans',
  gateway_order_id text unique,
  gateway_transaction_id text,
  gateway_response jsonb default '{}',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  requested_by uuid not null references app_users(id),
  plan plan_type not null default 'PRO',
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  notes text not null default '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_subscriptions_business on subscriptions (business_id, status);
create index if not exists idx_payments_business on payments (business_id, status);
create index if not exists idx_payments_gateway_order on payments (gateway_order_id);
create index if not exists idx_upgrade_requests_status on upgrade_requests (status);

-- RLS
alter table subscriptions enable row level security;
alter table payments enable row level security;
alter table upgrade_requests enable row level security;

drop policy if exists tenant_select on subscriptions;
create policy tenant_select on subscriptions for select using (is_service() or business_id = current_business_id());
drop policy if exists tenant_write on subscriptions;
create policy tenant_write on subscriptions for all using (is_service()) with check (is_service());

drop policy if exists tenant_select on payments;
create policy tenant_select on payments for select using (is_service() or business_id = current_business_id());
drop policy if exists tenant_write on payments;
create policy tenant_write on payments for all using (is_service()) with check (is_service());

drop policy if exists tenant_select on upgrade_requests;
create policy tenant_select on upgrade_requests for select using (is_service() or business_id = current_business_id());
drop policy if exists tenant_write on upgrade_requests;
create policy tenant_write on upgrade_requests for all using (is_service() or (business_id = current_business_id() and request_claim('role') = 'OWNER')) with check (is_service() or business_id = current_business_id());

grant select, insert, update on subscriptions, payments, upgrade_requests to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Function to check and expire subscriptions
create or replace function expire_subscriptions() returns void language plpgsql as $$
begin
  update subscriptions
  set status = 'EXPIRED', updated_at = now()
  where status = 'ACTIVE'
    and expires_at is not null
    and expires_at < now();

  update businesses
  set plan = 'FREE'
  where id in (
    select business_id from subscriptions
    where status = 'EXPIRED'
      and plan = 'PRO'
  )
  and plan = 'PRO';
end $$;

-- Function to activate PRO plan
create or replace function activate_pro_plan(p_business_id uuid, p_subscription_id uuid, p_duration_months integer default 1) returns void language plpgsql as $$
declare
  v_expires timestamptz := now() + (p_duration_months || ' months')::interval;
begin
  -- Update business plan
  update businesses set plan = 'PRO' where id = p_business_id;

  -- Update subscription
  update subscriptions
  set status = 'ACTIVE',
      plan = 'PRO',
      started_at = now(),
      expires_at = v_expires,
      updated_at = now()
  where id = p_subscription_id;

  -- Cancel any previous active subscriptions
  update subscriptions
  set status = 'CANCELLED', cancelled_at = now(), updated_at = now()
  where business_id = p_business_id
    and id != p_subscription_id
    and status = 'ACTIVE';
end $$;
