/**
 * Recalcula diet_type, cook_time_minutes y difficulty para recetas ya importadas.
 *
 * Uso:
 *   node scripts/rebalance-recipe-metadata.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const SOURCE_NAME = 'TheMealDB';
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

function normalizeText(value) {
  return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function containsAny(haystack, needles) {
  return needles.some((token) => haystack.includes(token));
}

function inferDietType({ title, instructions, ingredients }) {
  const blob = normalizeText([title, instructions, ...(ingredients || [])].join(' '));
  if (containsAny(blob, ['keto', 'low carb', 'low-carb'])) return 'keto';
  if (containsAny(blob, ['paleo'])) return 'paleo';
  if (containsAny(blob, ['gluten free', 'gluten-free', 'sin gluten'])) return 'gluten_free';
  if (containsAny(blob, ['vegan'])) return 'vegan';
  if (containsAny(blob, ['vegetarian'])) return 'vegetarian';

  const meatOrFish = [
    'beef',
    'pork',
    'ham',
    'bacon',
    'chicken',
    'turkey',
    'lamb',
    'goat',
    'duck',
    'fish',
    'salmon',
    'tuna',
    'anchovy',
    'anchovies',
    'shrimp',
    'prawn',
    'sardine',
    'oyster',
    'mussel',
    'clam',
    'octopus',
    'squid',
    'chorizo',
    'sausage',
  ];
  const dairyOrEggOrHoney = [
    'milk',
    'cream',
    'cheese',
    'butter',
    'yogurt',
    'yoghurt',
    'egg',
    'honey',
    'mayonnaise',
    'ghee',
  ];

  if (!containsAny(blob, meatOrFish)) {
    if (!containsAny(blob, dairyOrEggOrHoney)) return 'vegan';
    return 'vegetarian';
  }
  return 'balanced';
}

function estimateCookTimeMinutes({ instructions, ingredientCount, stepCount }) {
  const text = normalizeText(instructions);
  const explicitTimes = [];
  const rx = /(\d{1,3})\s*(hours?|hrs?|hr|minutes?|mins?|min|h)\b/g;
  for (const m of text.matchAll(rx)) {
    const n = Number(m[1]);
    const unit = m[2];
    if (!Number.isFinite(n) || n <= 0) continue;
    explicitTimes.push(unit.startsWith('h') ? n * 60 : n);
  }
  let estimated = Math.round(10 + stepCount * 4 + ingredientCount * 1.5);
  if (containsAny(text, ['bake', 'roast', 'simmer', 'stew', 'slow cook', 'braise'])) estimated += 18;
  if (containsAny(text, ['marinate', 'rest', 'chill', 'refrigerate'])) estimated += 15;
  if (containsAny(text, ['deep fry', 'fry'])) estimated += 8;
  if (explicitTimes.length > 0) {
    const explicitMax = Math.max(...explicitTimes);
    const explicitTotal = explicitTimes.reduce((a, b) => a + b, 0);
    estimated = Math.max(estimated, Math.min(explicitTotal, explicitMax + 45));
  }
  return Math.min(240, Math.max(10, estimated));
}

function difficultyFromSignals({ cookTimeMinutes, stepCount, ingredientCount }) {
  const complexity = stepCount + Math.ceil(ingredientCount / 3);
  if (cookTimeMinutes > 75 || complexity >= 14) return 'hard';
  if (cookTimeMinutes <= 25 && complexity <= 7) return 'easy';
  return 'medium';
}

async function main() {
  loadLocalEnv();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Faltan SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env');
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: rows, error } = await supabase
    .from('recipes')
    .select('id,title,full_instructions,quick_steps,recipe_ingredients(ingredients(name))')
    .eq('data_source_name', SOURCE_NAME);
  if (error) throw error;
  const recipes = rows || [];
  let updated = 0;
  for (const row of recipes) {
    const ingredients = (row.recipe_ingredients || [])
      .map((ri) => ri?.ingredients?.name?.trim())
      .filter(Boolean);
    const instructions = (row.full_instructions || '').trim();
    const stepCount = Array.isArray(row.quick_steps) ? row.quick_steps.filter(Boolean).length : 0;
    const diet_type = inferDietType({ title: row.title || '', instructions, ingredients });
    const cook_time_minutes = estimateCookTimeMinutes({
      instructions,
      ingredientCount: ingredients.length,
      stepCount,
    });
    const difficulty = difficultyFromSignals({
      cookTimeMinutes: cook_time_minutes,
      stepCount,
      ingredientCount: ingredients.length,
    });
    const { error: updateError } = await supabase
      .from('recipes')
      .update({ diet_type, cook_time_minutes, difficulty })
      .eq('id', row.id);
    if (updateError) {
      console.warn('Skip', row.id, updateError.message || updateError);
      continue;
    }
    updated += 1;
  }
  console.log(`Hecho. Recetas reclasificadas: ${updated}/${recipes.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
