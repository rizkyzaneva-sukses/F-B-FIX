-- 023: tutup lubang GRANT yang tersisa + kunci toko tunggal di level SQL.
--
-- Lubang yang masih ada setelah 021/022:
-- 1. ALTER DEFAULT PRIVILEGES di 021 hanya ON TABLES — sequence dan function baru
--    tetap tanpa grant (gejala: permission denied pada fungsi/sequence baru).
-- 2. Default privileges terikat ke role yang menjalankannya. Kalau migrasi di
--    lingkungan lain jalan sebagai role berbeda, grant otomatis tidak ikut.
-- 3. Pola grant/RLS/SECURITY DEFINER belum baku untuk tabel konfigurasi baru.
--
-- Kunci toko tunggal dikendalikan kolom instance_config.single_tenant (disetel
-- dari env SINGLE_TENANT oleh aplikasi saat start). Kalau menyala, INSERT toko
-- kedua ditolak di trigger DAN di register_business — bukan cuma di UI.

create table if not exists schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists instance_config (
  id boolean primary key default true check (id),
  single_tenant boolean not null default false,
  bootstrapped_at timestamptz,
  app_version text not null default '',
  updated_at timestamptz not null default now()
);

insert into instance_config (id, single_tenant)
values (true, false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Grants: objek yang sudah ada + default untuk objek yang akan dibuat
-- ---------------------------------------------------------------------------
do $$
begin
  execute format('grant anon, authenticated, service_role to %I', current_user);
exception when insufficient_privilege then
  raise notice 'Lewati grant role ke %', current_user;
end $$;

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

grant execute on all functions in schema public
  to anon, authenticated, service_role;

do $$
declare
  r text;
begin
  foreach r in array array[current_user, 'postgres']
  loop
    begin
      execute format(
        'alter default privileges for role %I in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role',
        r
      );
      execute format(
        'alter default privileges for role %I in schema public grant usage, select on sequences to anon, authenticated, service_role',
        r
      );
      execute format(
        'alter default privileges for role %I in schema public grant execute on functions to anon, authenticated, service_role',
        r
      );
    exception when insufficient_privilege or undefined_object then
      raise notice 'Lewati default privileges untuk role %', r;
    end;
  end loop;
end $$;

-- Role yang menjalankan file ini (paling sering = current_user) juga dapat
-- default privileges tanpa klausa FOR ROLE — menutup kasus role tidak terduga.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS: config instance dan daftar migrasi hanya untuk service_role
-- ---------------------------------------------------------------------------
alter table instance_config enable row level security;
alter table schema_migrations enable row level security;

drop policy if exists instance_config_service on instance_config;
create policy instance_config_service on instance_config
  using (is_service())
  with check (is_service());

drop policy if exists schema_migrations_service on schema_migrations;
create policy schema_migrations_service on schema_migrations
  for select
  using (is_service());

-- ---------------------------------------------------------------------------
-- Flag + kunci SQL
-- ---------------------------------------------------------------------------
create or replace function is_single_tenant()
returns boolean
language sql
stable
as $$
  select coalesce((select single_tenant from instance_config where id), false);
$$;

create or replace function set_instance_config(
  p_single_tenant boolean,
  p_app_version text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into instance_config (id, single_tenant, app_version, updated_at)
  values (true, p_single_tenant, coalesce(p_app_version, ''), now())
  on conflict (id) do update
    set single_tenant = excluded.single_tenant,
        app_version = excluded.app_version,
        updated_at = now();

  if p_single_tenant then
    update businesses
    set plan = 'PRO'
    where plan is distinct from 'PRO';
  end if;

  return jsonb_build_object(
    'single_tenant', p_single_tenant,
    'app_version', coalesce(p_app_version, '')
  );
end $$;

create or replace function enforce_single_tenant_business()
returns trigger
language plpgsql
as $$
begin
  if is_single_tenant() and exists (select 1 from businesses) then
    raise exception using
      errcode = 'P0006',
      message = 'Instalasi ini hanya untuk satu toko. Hubungi admin untuk klon baru.';
  end if;
  return new;
end $$;

drop trigger if exists trg_single_tenant_business on businesses;
create trigger trg_single_tenant_business
  before insert on businesses
  for each row
  execute function enforce_single_tenant_business();

-- register_business: tolak toko kedua saat single-tenant, dan paksa plan PRO.
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
  v_single boolean := is_single_tenant();
begin
  perform pg_advisory_xact_lock(hashtext('register_business'));

  if coalesce(trim(p_business_name), '') = '' then
    raise exception using errcode = '22023', message = 'Nama usaha wajib diisi';
  end if;
  if coalesce(trim(p_email), '') = '' or coalesce(trim(p_password_hash), '') = '' then
    raise exception using errcode = '22023', message = 'Email dan password wajib diisi';
  end if;

  if v_single and exists (select 1 from businesses) then
    raise exception using
      errcode = 'P0006',
      message = 'Instalasi ini hanya untuk satu toko. Hubungi admin untuk klon baru.';
  end if;

  if exists (select 1 from app_users where lower(email) = lower(trim(p_email))) then
    raise exception using errcode = 'P0005', message = 'Email sudah terdaftar';
  end if;

  insert into businesses (name, plan)
  values (
    trim(p_business_name),
    case when v_single then 'PRO'::plan_type else 'FREE'::plan_type end
  )
  returning id into v_business;

  insert into app_users (business_id, email, name, password_hash, role, email_verified)
  values (
    v_business,
    lower(trim(p_email)),
    coalesce(nullif(trim(p_name), ''), split_part(p_email, '@', 1)),
    p_password_hash,
    'OWNER',
    false
  )
  returning id into v_user;

  perform seed_default_units(v_business);

  return jsonb_build_object('business_id', v_business, 'user_id', v_user);
end $$;

grant execute on function is_single_tenant() to anon, authenticated, service_role;
grant execute on function set_instance_config(boolean, text) to service_role;
grant execute on function register_business(text, text, text, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
