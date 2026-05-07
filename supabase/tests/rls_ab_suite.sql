-- Suite base RLS A/B para Nibbly (ejecutar en Supabase SQL Editor).
-- Objetivo: verificar aislamiento entre 2 usuarios reales.
--
-- Uso:
-- 1) Reemplaza los UUID de user_a, user_b y recipe_id en el bloque DO.
-- 2) Ejecuta el script completo.
-- 3) Si todo va bien, verás NOTICE "RLS A/B suite passed".
-- 4) Si algo falla, el script lanza EXCEPTION con el caso roto.
--
-- Nota: corre dentro de transacción y hace ROLLBACK al final (no deja basura).

BEGIN;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  -- TODO: reemplazar por IDs reales de tu proyecto.
  user_a uuid := '11111111-1111-1111-1111-111111111111';
  user_b uuid := '22222222-2222-2222-2222-222222222222';
  test_recipe_id uuid := '33333333-3333-3333-3333-333333333333';
  default_user_a_placeholder uuid := '11111111-1111-1111-1111-111111111111';
  default_user_b_placeholder uuid := '22222222-2222-2222-2222-222222222222';
  default_recipe_placeholder uuid := '33333333-3333-3333-3333-333333333333';

  shopping_item_id uuid;
  event_id uuid;
  slot_day smallint := 1;
  slot_meal text := 'lunch';
  row_count integer;
BEGIN
  -- Prechecks para evitar falsos positivos por IDs no válidos.
  IF user_a = default_user_a_placeholder THEN
    SELECT r.created_by
    INTO user_a
    FROM public.recipes r
    WHERE r.is_published = true
      AND r.created_by IS NOT NULL
    ORDER BY r.created_at DESC
    LIMIT 1;
  END IF;

  IF user_b = default_user_b_placeholder THEN
    -- user_b solo se usa como identidad para probar acceso cruzado;
    -- no necesita existir en auth.users mientras sea distinto de user_a.
    user_b := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  END IF;

  IF user_a IS NULL THEN
    RAISE EXCEPTION
      'Precheck failed: no se pudo resolver user_a automáticamente. Reemplaza user_a por un auth.users.id real.';
  END IF;

  IF user_a = user_b THEN
    RAISE EXCEPTION 'Precheck failed: user_a y user_b no pueden ser iguales';
  END IF;

  IF test_recipe_id = default_recipe_placeholder THEN
    SELECT r.id
    INTO test_recipe_id
    FROM public.recipes r
    WHERE r.is_published = true
    ORDER BY r.created_at DESC
    LIMIT 1;
  END IF;

  IF test_recipe_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = test_recipe_id) THEN
    RAISE EXCEPTION 'Precheck failed: recipe_id (%) no existe en public.recipes', test_recipe_id;
  END IF;

  ---------------------------------------------------------------------------
  -- FAVORITES: A crea; B no puede leer ni borrar los favoritos de A.
  ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);

  INSERT INTO public.favorites (user_id, recipe_id)
  VALUES (user_a, test_recipe_id)
  ON CONFLICT (user_id, recipe_id) DO NOTHING;

  PERFORM set_config('request.jwt.claim.sub', user_b::text, true);

  SELECT count(*)
  INTO row_count
  FROM public.favorites
  WHERE user_id = user_a AND recipe_id = test_recipe_id;

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'RLS failed (favorites/select): user_b ve favoritos de user_a';
  END IF;

  DELETE FROM public.favorites
  WHERE user_id = user_a AND recipe_id = test_recipe_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'RLS failed (favorites/delete): user_b borró favoritos de user_a';
  END IF;

  ---------------------------------------------------------------------------
  -- SHOPPING LIST: A crea ítem; B no puede leer, modificar ni borrar.
  ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);

  INSERT INTO public.shopping_list_items (user_id, label, checked, sort_order)
  VALUES (user_a, '__rls_ab_item__', false, 9999)
  RETURNING id INTO shopping_item_id;

  PERFORM set_config('request.jwt.claim.sub', user_b::text, true);

  SELECT count(*)
  INTO row_count
  FROM public.shopping_list_items
  WHERE id = shopping_item_id;

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'RLS failed (shopping/select): user_b ve ítem de user_a';
  END IF;

  UPDATE public.shopping_list_items
  SET checked = true
  WHERE id = shopping_item_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'RLS failed (shopping/update): user_b actualizó ítem de user_a';
  END IF;

  DELETE FROM public.shopping_list_items
  WHERE id = shopping_item_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'RLS failed (shopping/delete): user_b borró ítem de user_a';
  END IF;

  ---------------------------------------------------------------------------
  -- RECIPE EVENTS: A crea evento; B no puede leer ni borrar.
  ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);

  INSERT INTO public.recipe_events (user_id, recipe_id, event_type, meta)
  VALUES (user_a, test_recipe_id, 'viewed', '{"source":"rls_ab_suite"}'::jsonb)
  RETURNING id INTO event_id;

  PERFORM set_config('request.jwt.claim.sub', user_b::text, true);

  SELECT count(*)
  INTO row_count
  FROM public.recipe_events
  WHERE id = event_id;

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'RLS failed (events/select): user_b ve eventos de user_a';
  END IF;

  DELETE FROM public.recipe_events
  WHERE id = event_id;
  GET DIAGNOSTICS row_count = ROW_COUNT;

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'RLS failed (events/delete): user_b borró eventos de user_a';
  END IF;

  ---------------------------------------------------------------------------
  -- WEEKLY MENU: A crea slot; B no puede leer, modificar ni borrar.
  ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);

  INSERT INTO public.weekly_menu_slots (user_id, day_of_week, meal_type, recipe_id)
  VALUES (user_a, slot_day, slot_meal, test_recipe_id)
  ON CONFLICT (user_id, day_of_week, meal_type)
  DO UPDATE SET recipe_id = EXCLUDED.recipe_id;

  PERFORM set_config('request.jwt.claim.sub', user_b::text, true);

  SELECT count(*)
  INTO row_count
  FROM public.weekly_menu_slots
  WHERE user_id = user_a AND day_of_week = slot_day AND meal_type = slot_meal;

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'RLS failed (weekly/select): user_b ve menú semanal de user_a';
  END IF;

  UPDATE public.weekly_menu_slots
  SET recipe_id = test_recipe_id
  WHERE user_id = user_a AND day_of_week = slot_day AND meal_type = slot_meal;
  GET DIAGNOSTICS row_count = ROW_COUNT;

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'RLS failed (weekly/update): user_b actualizó menú de user_a';
  END IF;

  DELETE FROM public.weekly_menu_slots
  WHERE user_id = user_a AND day_of_week = slot_day AND meal_type = slot_meal;
  GET DIAGNOSTICS row_count = ROW_COUNT;

  IF row_count <> 0 THEN
    RAISE EXCEPTION 'RLS failed (weekly/delete): user_b borró menú de user_a';
  END IF;

  ---------------------------------------------------------------------------
  -- STORAGE: user_b NO puede escribir en carpeta de user_a.
  ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', user_b::text, true);

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('recipe-images', user_a::text || '/__rls_ab_blocked__.jpg', user_b);

    RAISE EXCEPTION 'RLS failed (storage/insert): user_b pudo escribir en carpeta de user_a';
  EXCEPTION
    WHEN OTHERS THEN
      -- Esperado: rechazo por policy de storage.
      NULL;
  END;

  RAISE NOTICE 'RLS A/B suite passed';
END $$;

ROLLBACK;
