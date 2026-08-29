-- Repair: permission denied for table production_outputs
-- 011 hanya GRANT ke authenticated, dan create_production_batch bukan security definer
-- jadi INSERT/SELECT gagal tergantung role JWT yang aktif (anon / service_role / login user).

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
begin
  execute format(
    'grant select, insert, update, delete on all tables in schema public to %I',
    current_user
  );
exception when others then
  raise notice 'Lewati grant tables ke current_user: %', sqlerrm;
end $$;

alter function create_production_batch(jsonb) security definer;
alter function create_production_batch(jsonb) set search_path = public;

drop policy if exists production_outputs_tenant on production_outputs;
create policy production_outputs_tenant on production_outputs
  using (is_service() or business_id = current_business_id())
  with check (is_service() or business_id = current_business_id());

notify pgrst, 'reload schema';
