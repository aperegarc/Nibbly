/**
 * Verificación RLS A/B para Nibbly (usable en CI).
 *
 * Requiere variables:
 * - EXPO_PUBLIC_SUPABASE_URL
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY
 * - RLS_USER_A_EMAIL
 * - RLS_USER_A_PASSWORD
 * - RLS_USER_B_EMAIL
 * - RLS_USER_B_PASSWORD
 * - RLS_RECIPE_ID (receta publicada existente)
 */

import { createClient } from '@supabase/supabase-js';

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function createAuthedClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function signIn(client, email, password, label) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.user) {
    throw new Error(`Login failed for ${label}: ${error?.message ?? 'no session'}`);
  }
  return data.session.user.id;
}

async function main() {
  const supabaseUrl = requireEnv('EXPO_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  const recipeId = requireEnv('RLS_RECIPE_ID');

  const emailA = requireEnv('RLS_USER_A_EMAIL');
  const passA = requireEnv('RLS_USER_A_PASSWORD');
  const emailB = requireEnv('RLS_USER_B_EMAIL');
  const passB = requireEnv('RLS_USER_B_PASSWORD');

  const clientA = createAuthedClient(supabaseUrl, supabaseAnonKey);
  const clientB = createAuthedClient(supabaseUrl, supabaseAnonKey);

  const userA = await signIn(clientA, emailA, passA, 'user A');
  const userB = await signIn(clientB, emailB, passB, 'user B');
  assert(userA !== userB, 'RLS precheck failed: user A y user B son el mismo usuario');

  const tag = `rls-${Date.now()}`;
  const shoppingLabel = `__${tag}-shopping__`;
  const mealType = 'lunch';
  const dayOfWeek = 2;

  let shoppingId = null;
  let eventId = null;

  try {
    console.log('RLS check: favorites');
    {
      const { error } = await clientA.from('favorites').upsert([{ user_id: userA, recipe_id: recipeId }]);
      if (error) throw new Error(`favorites setup failed: ${error.message}`);

      const { data, error: readError } = await clientB
        .from('favorites')
        .select('recipe_id')
        .eq('user_id', userA)
        .eq('recipe_id', recipeId);
      if (readError) throw new Error(`favorites read failed: ${readError.message}`);
      assert((data ?? []).length === 0, 'RLS failed: user B puede leer favoritos de user A');

      const { error: deleteError, count } = await clientB
        .from('favorites')
        .delete({ count: 'exact' })
        .eq('user_id', userA)
        .eq('recipe_id', recipeId);
      if (deleteError) throw new Error(`favorites cross-delete errored unexpectedly: ${deleteError.message}`);
      assert((count ?? 0) === 0, 'RLS failed: user B pudo borrar favoritos de user A');
    }

    console.log('RLS check: shopping_list_items');
    {
      const { data, error } = await clientA
        .from('shopping_list_items')
        .insert([{ user_id: userA, label: shoppingLabel, checked: false, sort_order: 9999 }])
        .select('id')
        .single();
      if (error || !data?.id) throw new Error(`shopping setup failed: ${error?.message ?? 'missing id'}`);
      shoppingId = data.id;

      const { data: readData, error: readError } = await clientB
        .from('shopping_list_items')
        .select('id')
        .eq('id', shoppingId);
      if (readError) throw new Error(`shopping read failed: ${readError.message}`);
      assert((readData ?? []).length === 0, 'RLS failed: user B puede leer shopping item de user A');

      const { error: updateError, count: updateCount } = await clientB
        .from('shopping_list_items')
        .update({ checked: true }, { count: 'exact' })
        .eq('id', shoppingId);
      if (updateError) throw new Error(`shopping cross-update errored unexpectedly: ${updateError.message}`);
      assert((updateCount ?? 0) === 0, 'RLS failed: user B pudo modificar shopping item de user A');

      const { error: deleteError, count: deleteCount } = await clientB
        .from('shopping_list_items')
        .delete({ count: 'exact' })
        .eq('id', shoppingId);
      if (deleteError) throw new Error(`shopping cross-delete errored unexpectedly: ${deleteError.message}`);
      assert((deleteCount ?? 0) === 0, 'RLS failed: user B pudo borrar shopping item de user A');
    }

    console.log('RLS check: recipe_events');
    {
      const { data, error } = await clientA
        .from('recipe_events')
        .insert([{ user_id: userA, recipe_id: recipeId, event_type: 'viewed', meta: { source: 'ci' } }])
        .select('id')
        .single();
      if (error || !data?.id) throw new Error(`events setup failed: ${error?.message ?? 'missing id'}`);
      eventId = data.id;

      const { data: readData, error: readError } = await clientB.from('recipe_events').select('id').eq('id', eventId);
      if (readError) throw new Error(`events read failed: ${readError.message}`);
      assert((readData ?? []).length === 0, 'RLS failed: user B puede leer eventos de user A');

      const { error: deleteError, count } = await clientB
        .from('recipe_events')
        .delete({ count: 'exact' })
        .eq('id', eventId);
      if (deleteError) throw new Error(`events cross-delete errored unexpectedly: ${deleteError.message}`);
      assert((count ?? 0) === 0, 'RLS failed: user B pudo borrar eventos de user A');
    }

    console.log('RLS check: weekly_menu_slots');
    {
      const { error } = await clientA.from('weekly_menu_slots').upsert([
        { user_id: userA, day_of_week: dayOfWeek, meal_type: mealType, recipe_id: recipeId },
      ]);
      if (error) throw new Error(`weekly setup failed: ${error.message}`);

      const { data: readData, error: readError } = await clientB
        .from('weekly_menu_slots')
        .select('recipe_id')
        .eq('user_id', userA)
        .eq('day_of_week', dayOfWeek)
        .eq('meal_type', mealType);
      if (readError) throw new Error(`weekly read failed: ${readError.message}`);
      assert((readData ?? []).length === 0, 'RLS failed: user B puede leer menú semanal de user A');

      const { error: updateError, count: updateCount } = await clientB
        .from('weekly_menu_slots')
        .update({ recipe_id: recipeId }, { count: 'exact' })
        .eq('user_id', userA)
        .eq('day_of_week', dayOfWeek)
        .eq('meal_type', mealType);
      if (updateError) throw new Error(`weekly cross-update errored unexpectedly: ${updateError.message}`);
      assert((updateCount ?? 0) === 0, 'RLS failed: user B pudo modificar menú semanal de user A');

      const { error: deleteError, count: deleteCount } = await clientB
        .from('weekly_menu_slots')
        .delete({ count: 'exact' })
        .eq('user_id', userA)
        .eq('day_of_week', dayOfWeek)
        .eq('meal_type', mealType);
      if (deleteError) throw new Error(`weekly cross-delete errored unexpectedly: ${deleteError.message}`);
      assert((deleteCount ?? 0) === 0, 'RLS failed: user B pudo borrar menú semanal de user A');
    }

    console.log('RLS check: storage.objects write isolation');
    {
      const pathInsideAFolder = `${userA}/__${tag}-blocked__.txt`;
      const { error } = await clientB.storage
        .from('recipe-images')
        .upload(pathInsideAFolder, new Blob(['blocked']), { contentType: 'text/plain', upsert: false });
      assert(Boolean(error), 'RLS failed: user B pudo subir archivo en carpeta de user A');
    }

    console.log('RLS check PASSED');
  } finally {
    // Cleanup como user A para no dejar residuos.
    await clientA.from('favorites').delete().eq('user_id', userA).eq('recipe_id', recipeId);
    if (shoppingId) await clientA.from('shopping_list_items').delete().eq('id', shoppingId);
    if (eventId) await clientA.from('recipe_events').delete().eq('id', eventId);
    await clientA
      .from('weekly_menu_slots')
      .delete()
      .eq('user_id', userA)
      .eq('day_of_week', dayOfWeek)
      .eq('meal_type', mealType);
  }
}

main().catch((err) => {
  console.error(`RLS check FAILED: ${err.message}`);
  process.exit(1);
});
