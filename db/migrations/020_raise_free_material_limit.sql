-- Starter BOM dapur (template bahan baku) berisi ~25 item. Paket Gratis 10 slot
-- menolak seluruh import karena all-or-nothing, jadi data tidak pernah masuk.

alter table businesses alter column raw_material_limit set default 50;

update businesses
set raw_material_limit = 50
where plan = 'FREE' and raw_material_limit = 10;
