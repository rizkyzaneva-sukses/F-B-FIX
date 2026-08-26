-- Migration 018: Expand user roles for 3 Staff Roles + 1 Owner
-- Roles: OWNER, KASIR, GUDANG, FINANCE

alter type user_role add value if not exists 'GUDANG';
alter type user_role add value if not exists 'FINANCE';
