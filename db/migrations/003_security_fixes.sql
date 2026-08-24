-- Migration 003: Security fixes
-- 1. Fix RLS with_check to enforce role for KASIR
-- 2. Add missing indexes
-- 3. Add email index for login performance

-- Fix RLS policies: with_check must also verify role = OWNER for write operations
-- Previously, with_check only checked business_id, allowing KASIR to bypass frontend restrictions

do $$
declare t text;
begin
  foreach t in array array['units','items','parties','transactions','transaction_items',
                           'production_batches','production_materials','receivables',
                           'receivable_payments','expenses','audit_logs',
                           'capital_entries','payables','payable_payments'] loop
    -- Drop existing write policy
    execute format('drop policy if exists tenant_write on %I', t);

    -- Recreate with role check in BOTH using AND with_check
    if t = 'businesses' then
      execute format(
        'create policy tenant_write on %I for all '
        'using (is_service() or (id = current_business_id() and request_claim(''role'') = ''OWNER'')) '
        'with check (is_service() or (id = current_business_id() and request_claim(''role'') = ''OWNER''))',
        t
      );
    else
      execute format(
        'create policy tenant_write on %I for all '
        'using (is_service() or (business_id = current_business_id() and request_claim(''role'') = ''OWNER'')) '
        'with check (is_service() or (business_id = current_business_id() and request_claim(''role'') = ''OWNER''))',
        t
      );
    end if;
  end loop;
end $$;

-- Add index on app_users.email for login query performance
create index if not exists idx_app_users_email on app_users (email) where email is not null;

-- Add index on app_users for cashier PIN lookup
create index if not exists idx_app_users_business_role on app_users (business_id, role, is_active) where role = 'KASIR';

-- Add index on transactions for plan limit counting
create index if not exists idx_transactions_sale_month on transactions (business_id, transaction_type, occurred_at) where transaction_type = 'SALE';
