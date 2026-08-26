-- Migration 016: Cash Reconciliation
create table if not exists cash_reconciliations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  reconciliation_date date not null default current_date,
  system_cash numeric(15,2) not null default 0,
  physical_cash numeric(15,2) not null default 0,
  difference numeric(15,2) generated always as (physical_cash - system_cash) stored,
  notes text not null default '',
  status text not null default 'open' check (status in ('open','verified','disputed')),
  created_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  unique (business_id, reconciliation_date)
);

alter table cash_reconciliations enable row level security;
create policy tenant_read on cash_reconciliations for select using (business_id = current_business_id());
create policy tenant_write on cash_reconciliations for insert with check (business_id = current_business_id() and request_claim('role') = 'OWNER');
create policy tenant_update on cash_reconciliations for update using (business_id = current_business_id() and request_claim('role') = 'OWNER');

create or replace function upsert_cash_reconciliation(p_payload jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_business uuid := current_business_id();
  v_user uuid := current_user_id();
  v_rec_id uuid;
  v_date date := coalesce((p_payload->>'reconciliation_date')::date, current_date);
  v_system_cash numeric(15,2) := coalesce((p_payload->>'system_cash')::numeric, 0);
  v_physical_cash numeric(15,2) := coalesce((p_payload->>'physical_cash')::numeric, 0);
  v_notes text := coalesce(p_payload->>'notes', '');
  v_status text := coalesce(p_payload->>'status', 'open');
begin
  if v_business is null or v_user is null then raise exception using errcode = '42501', message = 'Sesi tidak valid'; end if;
  if request_claim('role') <> 'OWNER' then raise exception using errcode = '42501', message = 'Hanya owner yang bisa rekonsiliasi kas'; end if;
  insert into cash_reconciliations (business_id, reconciliation_date, system_cash, physical_cash, notes, status, created_by)
  values (v_business, v_date, v_system_cash, v_physical_cash, v_notes, v_status, v_user)
  on conflict (business_id, reconciliation_date)
  do update set system_cash = excluded.system_cash, physical_cash = excluded.physical_cash, notes = excluded.notes, status = excluded.status
  returning id into v_rec_id;
  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  values (v_business, v_user, 'cash_reconciliation_saved', 'cash_reconciliation', v_rec_id, jsonb_build_object('date', v_date, 'system', v_system_cash, 'physical', v_physical_cash, 'difference', v_physical_cash - v_system_cash));
  return jsonb_build_object('id', v_rec_id, 'difference', v_physical_cash - v_system_cash);
end $$;
grant execute on function upsert_cash_reconciliation(jsonb) to authenticated, service_role;
