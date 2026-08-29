-- Migration 019: Distinguish retail customers from B2B mitra on parties.

do $$ begin
  create type customer_kind as enum ('RETAIL', 'MITRA');
exception when duplicate_object then null; end $$;

alter table parties add column if not exists customer_kind customer_kind;

update parties
set customer_kind = 'RETAIL'
where party_type = 'CUSTOMER' and customer_kind is null;

update parties p
set customer_kind = 'MITRA'
where p.party_type = 'CUSTOMER'
  and exists (select 1 from sales_orders so where so.customer_id = p.id);

alter table parties drop constraint if exists parties_customer_kind_chk;
alter table parties add constraint parties_customer_kind_chk
  check (
    (party_type = 'SUPPLIER' and customer_kind is null)
    or (party_type = 'CUSTOMER' and customer_kind is not null)
  );

notify pgrst, 'reload schema';
