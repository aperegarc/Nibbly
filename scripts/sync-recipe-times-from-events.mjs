/**
 * Recalibra cook_time_minutes usando eventos reales de cooking_completed.
 *
 * Uso:
 *   node scripts/sync-recipe-times-from-events.mjs
 *   node scripts/sync-recipe-times-from-events.mjs --min-samples=3 --days=60
 *
 * Variables:
 *   SUPABASE_URL (o EXPO_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadLocalEnv() {
  const envPath = join(__dirname, '..', '.env');
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const map = new Map();
  for (const part of argv.slice(2)) {
    if (!part.startsWith('--')) continue;
    const [k, v] = part.slice(2).split('=');
    map.set(k, v ?? 'true');
  }
  return map;
}

function clampMinutes(value) {
  return Math.min(240, Math.max(5, Math.round(value)));
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv);
  const minSamples = Math.max(1, Number(args.get('min-samples') || 3));
  const days = Math.max(1, Number(args.get('days') || 90));
  const blendFromEvents = Math.min(0.8, Math.max(0.2, Number(args.get('blend') || 0.45)));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Faltan SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env');
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: recipes, error: recipeError } = await supabase.from('recipes').select('id,cook_time_minutes');
  if (recipeError) throw recipeError;

  const { data: events, error: eventError } = await supabase
    .from('recipe_events')
    .select('recipe_id,meta')
    .eq('event_type', 'cooking_completed')
    .gte('created_at', since);
  if (eventError) throw eventError;

  const byRecipe = new Map();
  for (const row of events || []) {
    const recipeId = row.recipe_id;
    const elapsedSec = Number(row?.meta?.elapsed_sec);
    if (!recipeId || !Number.isFinite(elapsedSec) || elapsedSec <= 0) continue;
    const mins = elapsedSec / 60;
    const list = byRecipe.get(recipeId) || [];
    list.push(mins);
    byRecipe.set(recipeId, list);
  }

  let updated = 0;
  for (const recipe of recipes || []) {
    const samples = byRecipe.get(recipe.id) || [];
    if (samples.length < minSamples) continue;

    const avgObserved = samples.reduce((a, b) => a + b, 0) / samples.length;
    const current = Number(recipe.cook_time_minutes) || 30;
    const recalculated = clampMinutes(current * (1 - blendFromEvents) + avgObserved * blendFromEvents);

    if (Math.abs(recalculated - current) < 1) continue;

    const { error: updateError } = await supabase
      .from('recipes')
      .update({ cook_time_minutes: recalculated })
      .eq('id', recipe.id);
    if (updateError) {
      console.warn('Skip', recipe.id, updateError.message || updateError);
      continue;
    }
    updated += 1;
  }

  console.log(`Hecho. Recetas ajustadas por uso real: ${updated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

