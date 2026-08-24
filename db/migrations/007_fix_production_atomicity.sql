-- Migration 007: Fix production batch atomicity

create or replace function create_production_batch(p_payload jsonb) returns jsonb language plpgsql as $$
declare
  v_business uuid := current_business_id();
  v_user uuid := current_user_id();
  v_output items%rowtype;
  v_material items%rowtype;
  v_line jsonb;
  v_output_qty numeric := (p_payload->>'output_qty')::numeric;
  v_other numeric := coalesce((p_payload->>'other_cost')::numeric, 0);
  v_material_cost numeric := 0;
  v_cogs numeric;
  v_batch uuid;
  v_code text;
begin
  -- Validate output product (with FOR UPDATE)
  select * into v_output
  from items
  where id = (p_payload->>'output_item_id')::uuid
    and business_id = v_business
    and item_type = 'PRODUCT'
    and is_active
  for update;

  if not found or v_output_qty <= 0 then
    raise exception using errcode = '22023', message = 'Produk output dan kuantitas wajib valid';
  end if;

  if jsonb_array_length(coalesce(p_payload->'materials', '[]'::jsonb)) = 0 then
    raise exception using errcode = '22023', message = 'Minimal satu bahan baku wajib dipilih';
  end if;

  -- Validate materials and calculate cost (with FOR UPDATE for each)
  for v_line in select * from jsonb_array_elements(p_payload->'materials') loop
    select * into v_material
    from items
    where id = (v_line->>'item_id')::uuid
      and business_id = v_business
      and item_type = 'RAW_MATERIAL'
      and is_active
    for update;

    if not found or (v_line->>'qty_used')::numeric <= 0 then
      raise exception using errcode = '22023', message = 'Bahan produksi tidak valid';
    end if;

    if v_material.stock_qty < (v_line->>'qty_used')::numeric then
      raise exception using errcode = 'P0004',
        message = format('Stok bahan %s tidak mencukupi. Tersedia: %s %s.',
          v_material.name, v_material.stock_qty,
          (select code from units where id = v_material.unit_id));
    end if;

    v_material_cost := v_material_cost + (v_line->>'qty_used')::numeric * v_material.last_buy_price;
  end loop;

  -- Calculate COGS
  v_cogs := round((v_material_cost + greatest(v_other, 0)) / v_output_qty, 2);

  -- Generate unique batch code
  v_code := 'BATCH-' || to_char(now(), 'YYMMDD') || '-' ||
    lpad((select count(*) + 1 from production_batches
          where business_id = v_business and produced_at::date = current_date)::text, 3, '0');

  -- Create batch record
  insert into production_batches (
    business_id, output_item_id, batch_code, output_qty,
    material_cost, other_cost, cogs_per_unit, created_by
  ) values (
    v_business, v_output.id, v_code, v_output_qty,
    round(v_material_cost, 2), round(greatest(v_other, 0), 2), v_cogs, v_user
  ) returning id into v_batch;

  -- Deduct materials and create material records (atomic)
  for v_line in select * from jsonb_array_elements(p_payload->'materials') loop
    select * into v_material from items where id = (v_line->>'item_id')::uuid for update;

    insert into production_materials (business_id, batch_id, item_id, qty_used, unit_cost, total_cost)
    values (v_business, v_batch, v_material.id,
            (v_line->>'qty_used')::numeric, v_material.last_buy_price,
            (v_line->>'qty_used')::numeric * v_material.last_buy_price);

    update items
    set stock_qty = stock_qty - (v_line->>'qty_used')::numeric
    where id = v_material.id;
  end loop;

  -- Add output quantity and update COGS
  update items
  set stock_qty = stock_qty + v_output_qty,
      last_cogs = v_cogs
  where id = v_output.id;

  -- Audit log
  insert into audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  values (v_business, v_user, 'production_batch_saved', 'production_batch', v_batch,
          jsonb_build_object(
            'output_item', v_output.name,
            'output_qty', v_output_qty,
            'cogs_per_unit', v_cogs,
            'material_count', jsonb_array_length(p_payload->'materials')
          ));

  return jsonb_build_object(
    'batch_id', v_batch,
    'batch_code', v_code,
    'cogs_per_unit', v_cogs
  );
end $$;
