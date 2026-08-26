-- Migration 017: Tighten financial integrity for returns, proofs, partial payments, and cash reconciliation

alter table invoice_payments add column if not exists payment_proof_url text;
alter table supplier_returns add column if not exists payable_adjustment numeric(15,2) not null default 0 check (payable_adjustment >= 0);
alter table supplier_returns add column if not exists refund_amount numeric(15,2) not null default 0 check (refund_amount >= 0);
alter table supplier_returns add column if not exists refund_method payment_method;

create or replace function pay_receivable(
  p_receivable_id uuid,
  p_amount numeric,
  p_method payment_method,
  p_payment_proof_url text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r receivables%rowtype;
  v_remaining numeric(15,2);
  v_new_status payment_status;
begin
  select * into r
  from receivables
  where id = p_receivable_id and business_id = current_business_id()
  for update;

  if not found or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'Piutang atau nominal tidak valid';
  end if;

  v_remaining := r.amount - r.paid_amount;
  if p_amount > v_remaining then
    raise exception using errcode = '22023', message = 'Pembayaran melebihi sisa tagihan';
  end if;

  v_new_status := case
    when r.paid_amount + p_amount >= r.amount then 'LUNAS'
    when r.paid_amount + p_amount > 0 then 'SEBAGIAN'
    else 'BELUM_LUNAS'
  end;

  update receivables
  set paid_amount = paid_amount + p_amount,
      status = v_new_status,
      updated_at = now()
  where id = r.id;

  insert into receivable_payments (business_id, receivable_id, amount, payment_method, payment_proof_url, created_by)
  values (current_business_id(), r.id, p_amount, p_method, nullif(p_payment_proof_url, ''), current_user_id());

  return jsonb_build_object('remaining_balance', v_remaining - p_amount, 'status', v_new_status);
end $$;

grant execute on function pay_receivable(uuid, numeric, payment_method, text) to authenticated, service_role;

create or replace function pay_payable(
  p_payable_id uuid,
  p_amount numeric,
  p_method payment_method,
  p_payment_proof_url text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p payables%rowtype;
  v_remaining numeric(15,2);
  v_new_status payment_status;
begin
  select * into p
  from payables
  where id = p_payable_id and business_id = current_business_id()
  for update;

  if not found or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'Utang atau nominal tidak valid';
  end if;

  v_remaining := p.amount - p.paid_amount;
  if p_amount > v_remaining then
    raise exception using errcode = '22023', message = 'Pembayaran melebihi sisa utang';
  end if;

  v_new_status := case
    when p.paid_amount + p_amount >= p.amount then 'LUNAS'
    when p.paid_amount + p_amount > 0 then 'SEBAGIAN'
    else 'BELUM_LUNAS'
  end;

  update payables
  set paid_amount = paid_amount + p_amount,
      status = v_new_status,
      updated_at = now()
  where id = p.id;

  update transactions
  set paid_amount = paid_amount + p_amount,
      payment_status = v_new_status
  where id = p.transaction_id;

  insert into payable_payments (business_id, payable_id, amount, payment_method, payment_proof_url, created_by)
  values (current_business_id(), p.id, p_amount, p_method, nullif(p_payment_proof_url, ''), current_user_id());

  return jsonb_build_object('remaining_balance', v_remaining - p_amount, 'status', v_new_status);
end $$;

grant execute on function pay_payable(uuid, numeric, payment_method, text) to authenticated, service_role;

create or replace function pay_invoice(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text,
  p_notes text,
  p_payment_proof_url text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := current_business_id();
  v_user_id uuid := current_user_id();
  v_current_paid numeric(15,2);
  v_total numeric(15,2);
  v_remaining numeric(15,2);
  v_new_paid numeric(15,2);
  v_new_status invoice_status;
  v_result jsonb;
begin
  select paid_amount, total_amount
  into v_current_paid, v_total
  from invoices
  where id = p_invoice_id and business_id = v_business_id
  for update;

  if v_total is null then
    raise exception using errcode = '22023', message = 'Invoice tidak ditemukan';
  end if;

  if p_amount <= 0 then
    raise exception using errcode = '22023', message = 'Nominal pembayaran harus lebih dari 0';
  end if;

  v_remaining := v_total - v_current_paid;
  if p_amount > v_remaining then
    raise exception using errcode = '22023', message = 'Pembayaran melebihi sisa invoice';
  end if;

  insert into invoice_payments (business_id, invoice_id, amount, payment_method, notes, payment_proof_url, created_by)
  values (v_business_id, p_invoice_id, p_amount, p_method::payment_method, coalesce(p_notes, ''), nullif(p_payment_proof_url, ''), v_user_id);

  v_new_paid := v_current_paid + p_amount;
  v_new_status := case when v_new_paid >= v_total then 'PAID' else 'PARTIAL' end;

  update invoices
  set paid_amount = v_new_paid,
      status = v_new_status,
      updated_at = now()
  where id = p_invoice_id;

  select jsonb_build_object('id', i.id, 'paid_amount', i.paid_amount, 'status', i.status)
  into v_result
  from invoices i
  where i.id = p_invoice_id;

  return v_result;
end $$;

grant execute on function pay_invoice(uuid, numeric, text, text, text) to authenticated, service_role;

create or replace function record_supplier_return(p_payload jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid := current_business_id();
  v_user uuid := current_user_id();
  v_return_id uuid;
  v_line jsonb;
  v_item items%rowtype;
  v_purchase transactions%rowtype;
  v_payable payables%rowtype;
  v_total numeric(15,2) := 0;
  v_purchase_id uuid := (p_payload->>'purchase_id')::uuid;
  v_supplier_id uuid;
  v_reason text := coalesce(nullif(p_payload->>'reason', ''), 'Retur barang');
  v_notes text := coalesce(p_payload->>'notes', '');
  v_return_date date := coalesce((p_payload->>'return_date')::date, current_date);
  v_refund_method payment_method := coalesce(nullif(p_payload->>'refund_method', '')::payment_method, 'TUNAI');
  v_qty numeric(15,2);
  v_unit_price numeric(15,2);
  v_purchased_qty numeric(15,2);
  v_already_returned numeric(15,2);
  v_payable_remaining numeric(15,2) := 0;
  v_payable_adjustment numeric(15,2) := 0;
  v_refund_amount numeric(15,2) := 0;
  v_new_payable_amount numeric(15,2);
  v_new_status payment_status;
begin
  if v_business is null or v_user is null then
    raise exception using errcode = '42501', message = 'Sesi tidak valid';
  end if;
  if request_claim('role') <> 'OWNER' then
    raise exception using errcode = '42501', message = 'Hanya owner yang bisa mencatat retur';
  end if;

  select * into v_purchase
  from transactions
  where id = v_purchase_id and business_id = v_business and transaction_type = 'PURCHASE'
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Pembelian tidak ditemukan';
  end if;

  v_supplier_id := v_purchase.party_id;
  if v_supplier_id is null then
    raise exception using errcode = '22023', message = 'Supplier pembelian tidak valid';
  end if;

  if nullif(p_payload->>'supplier_id', '') is not null
     and (p_payload->>'supplier_id')::uuid <> v_supplier_id then
    raise exception using errcode = '22023', message = 'Supplier retur tidak sesuai pembelian';
  end if;

  if jsonb_array_length(coalesce(p_payload->'items', '[]'::jsonb)) = 0 then
    raise exception using errcode = '22023', message = 'Minimal satu item retur wajib diisi';
  end if;

  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    v_qty := (v_line->>'qty')::numeric;

    select * into v_item
    from items
    where id = (v_line->>'item_id')::uuid
      and business_id = v_business
      and item_type = 'RAW_MATERIAL'
    for update;

    if not found or v_qty <= 0 then
      raise exception using errcode = '22023', message = 'Item retur tidak valid';
    end if;

    select coalesce(sum(qty), 0), coalesce(max(unit_price), v_item.last_buy_price)
    into v_purchased_qty, v_unit_price
    from transaction_items
    where business_id = v_business
      and transaction_id = v_purchase_id
      and item_id = v_item.id;

    if v_purchased_qty <= 0 then
      raise exception using errcode = '22023', message = format('Item %s tidak ada di pembelian ini', v_item.name);
    end if;

    select coalesce(sum(sri.qty), 0)
    into v_already_returned
    from supplier_return_items sri
    join supplier_returns sr on sr.id = sri.return_id
    where sr.business_id = v_business
      and sr.purchase_id = v_purchase_id
      and sri.item_id = v_item.id;

    if v_qty > v_purchased_qty - v_already_returned then
      raise exception using errcode = '22023', message = format('Qty retur %s melebihi sisa pembelian', v_item.name);
    end if;

    if v_item.track_stock and v_item.stock_qty < v_qty then
      raise exception using errcode = '22023', message = format('Stok %s tidak cukup untuk retur', v_item.name);
    end if;

    v_total := v_total + v_qty * coalesce(nullif(v_line->>'unit_price', '')::numeric, v_unit_price, v_item.last_buy_price, 0);
  end loop;

  select * into v_payable
  from payables
  where transaction_id = v_purchase_id and business_id = v_business
  for update;

  if found then
    v_payable_remaining := greatest(0, v_payable.amount - v_payable.paid_amount);
    v_payable_adjustment := least(v_total, v_payable_remaining);
  end if;

  v_refund_amount := v_total - v_payable_adjustment;

  insert into supplier_returns (
    business_id, purchase_id, supplier_id, return_date, reason, total, notes,
    payable_adjustment, refund_amount, refund_method, created_by
  )
  values (
    v_business, v_purchase_id, v_supplier_id, v_return_date, v_reason, v_total, v_notes,
    v_payable_adjustment, v_refund_amount, case when v_refund_amount > 0 then v_refund_method else null end, v_user
  )
  returning id into v_return_id;

  for v_line in select * from jsonb_array_elements(p_payload->'items') loop
    v_qty := (v_line->>'qty')::numeric;

    select * into v_item
    from items
    where id = (v_line->>'item_id')::uuid and business_id = v_business
    for update;

    select coalesce(max(unit_price), v_item.last_buy_price)
    into v_unit_price
    from transaction_items
    where business_id = v_business
      and transaction_id = v_purchase_id
      and item_id = v_item.id;

    v_unit_price := coalesce(nullif(v_line->>'unit_price', '')::numeric, v_unit_price, v_item.last_buy_price, 0);

    insert into supplier_return_items (business_id, return_id, item_id, qty, unit_price, subtotal)
    values (v_business, v_return_id, v_item.id, v_qty, v_unit_price, v_qty * v_unit_price);

    update items
    set stock_qty = stock_qty - v_qty
    where id = v_item.id;
  end loop;

  if found and v_payable_adjustment > 0 then
    v_new_payable_amount := v_payable.amount - v_payable_adjustment;
    v_new_status := case
      when v_payable.paid_amount >= v_new_payable_amount then 'LUNAS'
      when v_payable.paid_amount > 0 then 'SEBAGIAN'
      else 'BELUM_LUNAS'
    end;

    if v_new_payable_amount <= 0 then
      delete from payables where id = v_payable.id;
    else
      update payables
      set amount = v_new_payable_amount,
          status = v_new_status,
          updated_at = now()
      where id = v_payable.id;
    end if;

    update transactions
    set subtotal = greatest(0, subtotal - v_payable_adjustment),
        total = greatest(0, total - v_payable_adjustment),
        payment_status = v_new_status
    where id = v_purchase_id;
  end if;

  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  values (
    v_business, v_user, 'supplier_return_created', 'supplier_return', v_return_id,
    jsonb_build_object(
      'purchase_id', v_purchase_id,
      'total', v_total,
      'payable_adjustment', v_payable_adjustment,
      'refund_amount', v_refund_amount,
      'refund_method', case when v_refund_amount > 0 then v_refund_method::text else null end,
      'item_count', jsonb_array_length(p_payload->'items')
    )
  );

  return jsonb_build_object(
    'return_id', v_return_id,
    'total', v_total,
    'payable_adjustment', v_payable_adjustment,
    'refund_amount', v_refund_amount,
    'refund_method', case when v_refund_amount > 0 then v_refund_method::text else null end
  );
end $$;

grant execute on function record_supplier_return(jsonb) to authenticated, service_role;

create or replace function calculate_system_cash(p_date date default current_date) returns numeric
language sql
security definer
set search_path = public
as $$
  select
    coalesce((
      select sum(t.paid_amount - t.change_amount)
      from transactions t
      where t.business_id = current_business_id()
        and t.transaction_type = 'SALE'
        and t.payment_method = 'TUNAI'
        and t.occurred_at < (p_date + interval '1 day')
    ), 0)
    + coalesce((
      select sum(rp.amount)
      from receivable_payments rp
      where rp.business_id = current_business_id()
        and rp.payment_method = 'TUNAI'
        and rp.payment_date < (p_date + interval '1 day')
    ), 0)
    + coalesce((
      select sum(ip.amount)
      from invoice_payments ip
      where ip.business_id = current_business_id()
        and ip.payment_method = 'TUNAI'
        and ip.payment_date < (p_date + interval '1 day')
    ), 0)
    + coalesce((
      select sum(case when ce.entry_type = 'WITHDRAWAL' then -ce.amount else ce.amount end)
      from capital_entries ce
      where ce.business_id = current_business_id()
        and ce.entry_date <= p_date
    ), 0)
    + coalesce((
      select sum(sr.refund_amount)
      from supplier_returns sr
      where sr.business_id = current_business_id()
        and sr.refund_method = 'TUNAI'
        and sr.return_date <= p_date
    ), 0)
    - coalesce((
      select sum(t.paid_amount)
      from transactions t
      where t.business_id = current_business_id()
        and t.transaction_type = 'PURCHASE'
        and t.payment_method = 'TUNAI'
        and t.occurred_at < (p_date + interval '1 day')
    ), 0)
    - coalesce((
      select sum(pp.amount)
      from payable_payments pp
      where pp.business_id = current_business_id()
        and pp.payment_method = 'TUNAI'
        and pp.payment_date < (p_date + interval '1 day')
    ), 0)
    - coalesce((
      select sum(e.amount)
      from expenses e
      where e.business_id = current_business_id()
        and e.expense_date <= p_date
    ), 0);
$$;

grant execute on function calculate_system_cash(date) to authenticated, service_role;

create or replace function upsert_cash_reconciliation(p_payload jsonb) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid := current_business_id();
  v_user uuid := current_user_id();
  v_rec_id uuid;
  v_date date := coalesce((p_payload->>'reconciliation_date')::date, current_date);
  v_system_cash numeric(15,2);
  v_physical_cash numeric(15,2) := coalesce((p_payload->>'physical_cash')::numeric, 0);
  v_notes text := coalesce(p_payload->>'notes', '');
  v_status text := coalesce(nullif(p_payload->>'status', ''), 'open');
begin
  if v_business is null or v_user is null then
    raise exception using errcode = '42501', message = 'Sesi tidak valid';
  end if;
  if request_claim('role') <> 'OWNER' then
    raise exception using errcode = '42501', message = 'Hanya owner yang bisa rekonsiliasi kas';
  end if;
  if v_physical_cash < 0 then
    raise exception using errcode = '22023', message = 'Kas fisik tidak boleh negatif';
  end if;
  if v_status not in ('open', 'verified', 'disputed') then
    raise exception using errcode = '22023', message = 'Status rekonsiliasi tidak valid';
  end if;

  v_system_cash := calculate_system_cash(v_date);

  insert into cash_reconciliations (business_id, reconciliation_date, system_cash, physical_cash, notes, status, created_by)
  values (v_business, v_date, v_system_cash, v_physical_cash, v_notes, v_status, v_user)
  on conflict (business_id, reconciliation_date)
  do update set
    system_cash = excluded.system_cash,
    physical_cash = excluded.physical_cash,
    notes = excluded.notes,
    status = excluded.status
  returning id into v_rec_id;

  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  values (
    v_business, v_user, 'cash_reconciliation_saved', 'cash_reconciliation', v_rec_id,
    jsonb_build_object('date', v_date, 'system', v_system_cash, 'physical', v_physical_cash, 'difference', v_physical_cash - v_system_cash)
  );

  return jsonb_build_object(
    'id', v_rec_id,
    'reconciliation_date', v_date,
    'system_cash', v_system_cash,
    'physical_cash', v_physical_cash,
    'difference', v_physical_cash - v_system_cash,
    'status', v_status
  );
end $$;

grant execute on function upsert_cash_reconciliation(jsonb) to authenticated, service_role;
