-- 011: Multi-output production — one batch can produce multiple products
-- Example: Bahan A+B+C+D → Chili Oil 250ml (4 pcs), 500ml (1 pc), 100ml (10 pcs)

-- 1. New table for batch outputs
create table if not exists production_outputs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  batch_id uuid not null references production_batches(id) on delete cascade,
  item_id uuid not null references items(id) on delete restrict,
  qty numeric not null check (qty > 0),
  cogs_per_unit numeric not null default 0
);

alter table production_outputs enable row level security;

-- RLS: same pattern as production_materials
create policy production_outputs_tenant on production_outputs
  using (business_id = current_business_id())
  with check (business_id = current_business_id());

grant select, insert, update, delete on production_outputs to authenticated;

-- 2. Replace create_production_batch to support multi-output
create or replace function create_production_batch(p_payload jsonb)
returns jsonb language plpgsql as $$
declare
  v_business uuid := current_business_id();
  v_user uuid := current_user_id();
  v_material items%rowtype;
  v_output_item items%rowtype;
  v_line jsonb;
  v_output jsonb;
  v_other numeric := coalesce((p_payload->>'other_cost')::numeric, 0);
  v_material_cost numeric := 0;
  v_total_output_qty numeric := 0;
  v_cogs numeric;
  v_batch uuid;
  v_code text;
  v_outputs jsonb := coalesce(p_payload->'outputs', '[]'::jsonb);
  v_has_outputs boolean := jsonb_array_length(v_outputs) > 0;
  -- Legacy single-output fields
  v_output_item_id text := p_payload->>'output_item_id';
  v_output_qty numeric := coalesce((p_payload->>'output_qty')::numeric, 0);
begin
  -- Validate materials
  if jsonb_array_length(coalesce(p_payload->'materials', '[]'::jsonb)) = 0 then
    raise exception using errcode = '22023', message = 'Minimal satu bahan baku wajib dipilih';
  end if;

  -- Validate and sum material costs
  for v_line in select * from jsonb_array_elements(p_payload->'materials') loop
    select * into v_material from items
      where id = (v_line->>'item_id')::uuid and business_id = v_business and item_type = 'RAW_MATERIAL' and is_active
      for update;
    if not found or (v_line->>'qty_used')::numeric <= 0 then
      raise exception using errcode = '22023', message = 'Bahan produksi tidak valid';
    end if;
    if v_material.stock_qty < (v_line->>'qty_used')::numeric then
      raise exception using errcode = 'P0004',
        message = format('Stok bahan %s tidak mencukupi. Tersedia: %s %s.', v_material.name, v_material.stock_qty, (select code from units where id = v_material.unit_id));
    end if;
    v_material_cost := v_material_cost + (v_line->>'qty_used')::numeric * v_material.last_buy_price;
  end loop;

  -- Build outputs list: support both new multi-output and legacy single-output
  if v_has_outputs then
    -- New format: validate each output
    for v_output in select * from jsonb_array_elements(v_outputs) loop
      select * into v_output_item from items
        where id = (v_output->>'item_id')::uuid and business_id = v_business and item_type = 'PRODUCT' and is_active;
      if not found or coalesce((v_output->>'qty')::numeric, 0) <= 0 then
        raise exception using errcode = '22023', message = 'Produk output tidak valid';
      end if;
      v_total_output_qty := v_total_output_qty + (v_output->>'qty')::numeric;
    end loop;
  elsif v_output_item_id is not null and v_output_qty > 0 then
    -- Legacy format: single output
    select * into v_output_item from items
      where id = v_output_item_id::uuid and business_id = v_business and item_type = 'PRODUCT' and is_active;
    if not found then
      raise exception using errcode = '22023', message = 'Produk output dan kuantitas wajib valid';
    end if;
    v_total_output_qty := v_output_qty;
    v_outputs := jsonb_build_array(jsonb_build_object('item_id', v_output_item_id, 'qty', v_output_qty));
  else
    raise exception using errcode = '22023', message = 'Minimal satu produk output wajib dipilih';
  end if;

  -- Calculate COGS per unit (total cost / total output units)
  v_cogs := round((v_material_cost + greatest(v_other, 0)) / v_total_output_qty, 2);

  -- Generate batch code
  v_code := 'BATCH-' || to_char(now(), 'YYMMDD') || '-' ||
    lpad((select count(*) + 1 from production_batches where business_id = v_business and produced_at::date = current_date)::text, 3, '0');

  -- Insert batch (use first output for backward compat with output_item_id)
  insert into production_batches (business_id, output_item_id, batch_code, output_qty, material_cost, other_cost, cogs_per_unit, created_by)
  values (
    v_business,
    (v_outputs->0->>'item_id')::uuid,
    v_code,
    v_total_output_qty,
    round(v_material_cost, 2),
    round(greatest(v_other, 0), 2),
    v_cogs,
    v_user
  ) returning id into v_batch;

  -- Insert each output
  for v_output in select * from jsonb_array_elements(v_outputs) loop
    insert into production_outputs (business_id, batch_id, item_id, qty, cogs_per_unit)
    values (v_business, v_batch, (v_output->>'item_id')::uuid, (v_output->>'qty')::numeric, v_cogs);

    -- Add stock for each output product
    update items set stock_qty = stock_qty + (v_output->>'qty')::numeric, last_cogs = v_cogs
      where id = (v_output->>'item_id')::uuid;
  end loop;

  -- Deduct materials
  for v_line in select * from jsonb_array_elements(p_payload->'materials') loop
    select * into v_material from items where id = (v_line->>'item_id')::uuid;
    insert into production_materials (business_id, batch_id, item_id, qty_used, unit_cost, total_cost)
      values (v_business, v_batch, v_material.id, (v_line->>'qty_used')::numeric, v_material.last_buy_price, (v_line->>'qty_used')::numeric * v_material.last_buy_price);
    update items set stock_qty = stock_qty - (v_line->>'qty_used')::numeric where id = v_material.id;
  end loop;

  -- Audit log
  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
    values (v_business, v_user, 'production_batch_saved', 'production_batch', v_batch, p_payload);

  return jsonb_build_object('batch_id', v_batch, 'batch_code', v_code, 'cogs_per_unit', v_cogs);
end $$;
