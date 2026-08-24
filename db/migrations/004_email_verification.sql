-- Migration 004: Email verification and password reset tokens

-- Add email_verified column to app_users
alter table app_users add column if not exists email_verified boolean not null default false;

-- Verification tokens table
create table if not exists verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  token_hash text not null unique,
  purpose text not null check (purpose in ('email_verify', 'password_reset')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_verification_tokens_hash on verification_tokens (token_hash) where used_at is null;
create index if not exists idx_verification_tokens_user on verification_tokens (user_id, purpose);

alter table verification_tokens enable row level security;

-- Only service_role can manage tokens (no direct user access)
drop policy if exists tenant_select on verification_tokens;
create policy tenant_select on verification_tokens for select using (is_service());
drop policy if exists tenant_write on verification_tokens;
create policy tenant_write on verification_tokens for all using (is_service()) with check (is_service());

grant select, insert, update on verification_tokens to service_role;
grant usage, select on all sequences in schema public to service_role;
