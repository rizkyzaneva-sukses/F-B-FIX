-- Migration 010: Coupon redemption for free PRO upgrades
--
-- Lets an owner activate PRO without going through Midtrans, e.g. the WAKAF code that
-- gives PRO away for free. Redemption is a SECURITY DEFINER function so the checks live
-- next to the write: a coupon can be capped, expired, or switched off, and the same
-- business can never redeem the same code twice.

create table if not exists coupons (
  code text primary key,
  plan plan_type not null default 'PRO',
  -- NULL means the upgrade never expires.
  duration_months integer check (duration_months is null or duration_months > 0),
  -- NULL means unlimited redemptions.
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_code text not null references coupons(code) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  redeemed_by uuid not null references app_users(id),
  redeemed_at timestamptz not null default now(),
  unique (coupon_code, business_id)
);

create index if not exists idx_coupon_redemptions_business on coupon_redemptions (business_id);

alter table coupons enable row level security;
alter table coupon_redemptions enable row level security;

-- Coupon definitions are never readable by tenants: knowing which codes exist is the
-- whole secret. Redemption goes through the SECURITY DEFINER function below.
drop policy if exists tenant_select on coupons;
drop policy if exists tenant_write on coupons;
create policy tenant_select on coupons for select using (is_service());
create policy tenant_write on coupons for all using (is_service()) with check (is_service());

drop policy if exists tenant_select on coupon_redemptions;
drop policy if exists tenant_write on coupon_redemptions;
create policy tenant_select on coupon_redemptions for select using (is_service() or business_id = current_business_id());
create policy tenant_write on coupon_redemptions for all using (is_service()) with check (is_service());

grant select, insert, update on coupons, coupon_redemptions to service_role;
grant select on coupon_redemptions to authenticated;

create or replace function redeem_coupon(p_code text) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid := current_business_id();
  v_user uuid := current_user_id();
  v_role text := request_claim('role');
  v_coupon coupons%rowtype;
  v_expires timestamptz;
  v_subscription uuid;
  v_normalized text := upper(trim(coalesce(p_code, '')));
begin
  if v_business is null or v_user is null then
    raise exception using errcode = '42501', message = 'Sesi tidak valid';
  end if;
  if v_role <> 'OWNER' then
    raise exception using errcode = '42501', message = 'Hanya pemilik usaha yang bisa memakai kupon';
  end if;
  if v_normalized = '' then
    raise exception using errcode = '22023', message = 'Kode kupon wajib diisi';
  end if;

  -- Lock so two simultaneous redemptions cannot both slip past max_redemptions.
  select * into v_coupon from coupons where code = v_normalized for update;

  if not found or not v_coupon.is_active then
    raise exception using errcode = 'P0006', message = 'Kode kupon tidak ditemukan atau sudah tidak berlaku';
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    raise exception using errcode = 'P0006', message = 'Kode kupon sudah kedaluwarsa';
  end if;
  if v_coupon.max_redemptions is not null and v_coupon.redemption_count >= v_coupon.max_redemptions then
    raise exception using errcode = 'P0006', message = 'Kuota kupon sudah habis';
  end if;
  if exists (select 1 from coupon_redemptions where coupon_code = v_normalized and business_id = v_business) then
    raise exception using errcode = 'P0007', message = 'Kupon ini sudah pernah dipakai oleh usaha kamu';
  end if;
  if (select plan from businesses where id = v_business) = 'PRO' then
    raise exception using errcode = 'P0008', message = 'Usaha kamu sudah memakai paket PRO';
  end if;

  insert into coupon_redemptions (coupon_code, business_id, redeemed_by)
  values (v_normalized, v_business, v_user);

  update coupons set redemption_count = redemption_count + 1 where code = v_normalized;

  v_expires := case
    when v_coupon.duration_months is null then null
    else now() + (v_coupon.duration_months || ' months')::interval
  end;

  update subscriptions
  set status = 'CANCELLED', cancelled_at = now(), updated_at = now()
  where business_id = v_business and status = 'ACTIVE';

  insert into subscriptions (business_id, plan, status, started_at, expires_at, payment_gateway)
  values (v_business, v_coupon.plan, 'ACTIVE', now(), v_expires, 'coupon')
  returning id into v_subscription;

  update businesses set plan = v_coupon.plan where id = v_business;

  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  values (v_business, v_user, 'coupon_redeemed', 'subscription', v_subscription,
          jsonb_build_object('code', v_normalized, 'plan', v_coupon.plan, 'expires_at', v_expires));

  return jsonb_build_object(
    'plan', v_coupon.plan,
    'subscription_id', v_subscription,
    'expires_at', v_expires
  );
end $$;

grant execute on function redeem_coupon(text) to authenticated, service_role;

-- WAKAF: free PRO, no expiry, unlimited redemptions.
-- Anyone who learns this code gets PRO for free, so cap or disable it when needed:
--   update coupons set max_redemptions = 50 where code = 'WAKAF';
--   update coupons set is_active = false where code = 'WAKAF';
insert into coupons (code, plan, duration_months, max_redemptions, notes)
values ('WAKAF', 'PRO', null, null, 'Wakaf: PRO gratis tanpa batas waktu')
on conflict (code) do nothing;
