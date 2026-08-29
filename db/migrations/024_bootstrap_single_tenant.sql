-- 024: bootstrap toko pertama dari parameter (dipanggil aplikasi saat start).
-- Idempotent: kalau businesses sudah ada, kembalikan toko + owner yang ada
-- tanpa membuat baris baru. Kunci advisory mencegah dua proses bootstrap
-- bersamaan (kasus web restart berulang saat migrate baru selesai).

create or replace function bootstrap_single_tenant(
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
  v_created boolean := false;
begin
  perform pg_advisory_xact_lock(hashtext('bootstrap_single_tenant'));

  if exists (select 1 from businesses) then
    select b.id into v_business from businesses b order by b.created_at limit 1;
    select u.id into v_user
    from app_users u
    where u.business_id = v_business and u.role = 'OWNER'
    order by u.created_at
    limit 1;

    update businesses set plan = 'PRO' where id = v_business and plan is distinct from 'PRO';

    update instance_config
    set bootstrapped_at = coalesce(bootstrapped_at, now()),
        updated_at = now()
    where id;

    return jsonb_build_object(
      'business_id', v_business,
      'user_id', v_user,
      'created', false
    );
  end if;

  if coalesce(trim(p_business_name), '') = '' then
    raise exception using errcode = '22023', message = 'Nama usaha wajib diisi';
  end if;
  if coalesce(trim(p_email), '') = '' or coalesce(trim(p_password_hash), '') = '' then
    raise exception using errcode = '22023', message = 'Email dan password wajib diisi';
  end if;

  insert into businesses (name, plan)
  values (trim(p_business_name), 'PRO')
  returning id into v_business;

  insert into app_users (business_id, email, name, password_hash, role, email_verified)
  values (
    v_business,
    lower(trim(p_email)),
    coalesce(nullif(trim(p_name), ''), split_part(p_email, '@', 1)),
    p_password_hash,
    'OWNER',
    true
  )
  returning id into v_user;

  perform seed_default_units(v_business);

  update instance_config
  set bootstrapped_at = now(),
      updated_at = now()
  where id;

  v_created := true;

  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  values (
    v_business,
    v_user,
    'single_tenant_bootstrapped',
    'business',
    v_business,
    jsonb_build_object('email', lower(trim(p_email)), 'business_name', trim(p_business_name))
  );

  return jsonb_build_object(
    'business_id', v_business,
    'user_id', v_user,
    'created', v_created
  );
end $$;

grant execute on function bootstrap_single_tenant(text, text, text, text) to service_role;

notify pgrst, 'reload schema';
