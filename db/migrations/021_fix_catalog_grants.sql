-- Tabel baru di 014/016 lupa di-GRANT ke role PostgREST. Akibatnya GET /api/bootstrap
-- gagal total (Promise.all) meski insert items sukses — UI terlihat "berhasil tapi tidak
-- sinkron" setelah reload.

grant select, insert, update, delete on table
  supplier_returns,
  supplier_return_items,
  cash_reconciliations,
  production_outputs
to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

-- Satuan di form Tambah Bahan (porsi/box/pack) belum ada di seed default.
create or replace function seed_default_units(p_business_id uuid) returns void language plpgsql security definer as $$
begin
  insert into units (business_id, code, label, is_locked) values
    (p_business_id, 'g', 'Gram', true),
    (p_business_id, 'kg', 'Kilogram', true),
    (p_business_id, 'ml', 'Mililiter', true),
    (p_business_id, 'liter', 'Liter', true),
    (p_business_id, 'pcs', 'Pieces', true),
    (p_business_id, 'botol', 'Botol', true),
    (p_business_id, 'jar', 'Jar', true),
    (p_business_id, 'porsi', 'Porsi', true),
    (p_business_id, 'box', 'Box', true),
    (p_business_id, 'pack', 'Pack', true)
  on conflict (business_id, code) do nothing;
end $$;

insert into units (business_id, code, label, is_locked)
select b.id, x.code, x.label, true
from businesses b
cross join (values
  ('porsi', 'Porsi'),
  ('box', 'Box'),
  ('pack', 'Pack')
) as x(code, label)
on conflict (business_id, code) do nothing;

notify pgrst, 'reload schema';
