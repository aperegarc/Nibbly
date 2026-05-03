/**
 * Importación de recetas desde TheMealDB (API pública).
 *
 * Carga variables desde `.env` en la raíz del proyecto (sin sobreescribir lo ya definido en el sistema).
 *
 * Uso:
 *   node scripts/import-themealdb.mjs --count=12 --letter=a
 *   node scripts/import-themealdb.mjs --all-letters --per-letter=8 --max-total=200
 *   node scripts/import-themealdb.mjs --letters=a,b,c,d --per-letter=15
 *   node scripts/import-themealdb.mjs --no-translate   (deja texto en inglés; aún guarda instrucciones completas)
 *
 * Variables: SUPABASE_URL (o EXPO_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY.
 * Opcional: LIBRETRANSLATE_URL (por defecto https://libretranslate.com), LIBRETRANSLATE_API_KEY.
 *
 * Lee legal/DATA_SOURCES.md antes de usar en producción.
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const THEMEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1';
const SOURCE_NAME = 'TheMealDB';
const SOURCE_URL = 'https://www.themealdb.com';
const LIBRETRANSLATE_DEFAULT = 'https://libretranslate.com';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadLocalEnv() {
  const envPath = join(__dirname, '..', '.env');
  if (!existsSync(envPath)) {
    return;
  }
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const map = new Map();
  for (const part of argv.slice(2)) {
    if (!part.startsWith('--')) {
      continue;
    }
    const [k, v] = part.slice(2).split('=');
    map.set(k, v ?? 'true');
  }
  return map;
}

function mapDiet(category) {
  const c = (category || '').toLowerCase();
  if (c.includes('vegan')) return 'vegan';
  if (c.includes('vegetarian')) return 'vegetarian';
  return 'balanced';
}

function mapDifficulty(instructionText) {
  const steps = instructionText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 4);
  return steps.length <= 5 ? 'easy' : 'medium';
}

function quickStepsFromInstructions(text) {
  if (!text) return ['Sin instrucciones detalladas.'];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const merged = lines.length > 0 ? lines : text.split('.').map((l) => l.trim()).filter(Boolean);
  return merged.slice(0, 14);
}

function ingredientNamesFromMeal(meal) {
  const names = [];
  for (let i = 1; i <= 20; i += 1) {
    const raw = meal[`strIngredient${i}`];
    if (!raw || !raw.trim()) continue;
    names.push(raw.trim());
  }
  return names;
}

/** Evita (recipe_id, ingredient_id) duplicado cuando TheMealDB repite el mismo ingrediente. */
function uniqueIngredientNamesPreserveOrder(names) {
  const seen = new Set();
  const out = [];
  for (const n of names) {
    const t = n.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function chunkByLength(text, maxLen) {
  const t = (text || '').trim();
  if (!t) {
    return [];
  }
  if (t.length <= maxLen) {
    return [t];
  }
  const parts = [];
  let i = 0;
  while (i < t.length) {
    let end = Math.min(i + maxLen, t.length);
    if (end < t.length) {
      const slice = t.slice(i, end);
      const breakAt = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('. '));
      if (breakAt > maxLen * 0.35) {
        end = i + breakAt + 1;
      }
    }
    const piece = t.slice(i, end).trim();
    if (piece) {
      parts.push(piece);
    }
    i = end;
  }
  return parts;
}

async function translateChunkLibre(text, apiKey, baseUrl) {
  const root = baseUrl.replace(/\/$/, '');
  const res = await fetch(`${root}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: 'en',
      target: 'es',
      format: 'text',
      api_key: apiKey || '',
    }),
  });
  if (!res.ok) {
    throw new Error(`LibreTranslate HTTP ${res.status}`);
  }
  const json = await res.json();
  return typeof json.translatedText === 'string' ? json.translatedText : text;
}

async function translateToSpanish(text, { enabled, apiKey, baseUrl }) {
  const raw = (text || '').trim();
  if (!raw) {
    return '';
  }
  if (!enabled) {
    return raw;
  }
  const chunks = chunkByLength(raw, 3200);
  const out = [];
  for (const chunk of chunks) {
    await sleep(450);
    try {
      out.push(await translateChunkLibre(chunk, apiKey, baseUrl));
    } catch (e) {
      console.warn('Traducción (fragmento) no disponible, se deja EN:', e.message || e);
      out.push(chunk);
    }
  }
  return out.join('\n\n').trim();
}

async function ensureIngredient(supabase, name) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Nombre de ingrediente vacío');
  }

  const { data: foundExact } = await supabase.from('ingredients').select('id').eq('name', trimmed).maybeSingle();
  if (foundExact?.id) {
    return foundExact.id;
  }

  const { data: foundCi } = await supabase.from('ingredients').select('id').ilike('name', trimmed).maybeSingle();
  if (foundCi?.id) {
    return foundCi.id;
  }

  const { data: created, error } = await supabase.from('ingredients').insert({ name: trimmed }).select('id').single();
  if (error) {
    if (error.code === '23505') {
      const { data: afterRace } = await supabase.from('ingredients').select('id').ilike('name', trimmed).maybeSingle();
      if (afterRace?.id) {
        return afterRace.id;
      }
    }
    const { data: retryEq } = await supabase.from('ingredients').select('id').eq('name', trimmed).maybeSingle();
    if (retryEq?.id) {
      return retryEq.id;
    }
    throw error;
  }
  return created.id;
}

async function upsertRecipeFromMeal(supabase, meal, importOptions) {
  const translateEnabled = importOptions?.translate !== false;
  const apiKey = process.env.LIBRETRANSLATE_API_KEY || '';
  const baseUrl = process.env.LIBRETRANSLATE_URL || LIBRETRANSLATE_DEFAULT;

  const externalId = meal.idMeal;
  const title = meal.strMeal?.trim();
  const imageUrl = meal.strMealThumb;
  const instructions = meal.strInstructions || '';
  if (!externalId || !title || !imageUrl) {
    return { skipped: true };
  }

  const titleEs = await translateToSpanish(title, { enabled: translateEnabled, apiKey, baseUrl });
  await sleep(translateEnabled ? 200 : 0);
  const instructionsEs = await translateToSpanish(instructions, {
    enabled: translateEnabled,
    apiKey,
    baseUrl,
  });

  const ingredientNames = uniqueIngredientNamesPreserveOrder(ingredientNamesFromMeal(meal));
  const bodyForSteps = instructionsEs || instructions;
  const quickSteps = quickStepsFromInstructions(bodyForSteps);
  const dietType = mapDiet(meal.strCategory);
  const difficulty = mapDifficulty(instructions);

  const row = {
    title: titleEs || title,
    description: null,
    image_url: imageUrl,
    quick_steps: quickSteps,
    full_instructions: bodyForSteps.trim() ? bodyForSteps.trim() : null,
    cook_time_minutes: 30,
    difficulty,
    diet_type: dietType,
    is_published: true,
    external_id: externalId,
    data_source_name: SOURCE_NAME,
    data_source_url: SOURCE_URL,
  };

  const { data: existing } = await supabase
    .from('recipes')
    .select('id')
    .eq('data_source_name', SOURCE_NAME)
    .eq('external_id', externalId)
    .maybeSingle();

  let recipeId = existing?.id;

  if (recipeId) {
    const { error } = await supabase.from('recipes').update(row).eq('id', recipeId);
    if (error) throw error;
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
  } else {
    const { data: inserted, error } = await supabase.from('recipes').insert(row).select('id').single();
    if (error) throw error;
    recipeId = inserted.id;
  }

  let order = 0;
  for (const ingName of ingredientNames) {
    const ingredientId = await ensureIngredient(supabase, ingName);
    const { error: linkError } = await supabase.from('recipe_ingredients').insert({
      recipe_id: recipeId,
      ingredient_id: ingredientId,
      sort_order: order,
    });
    if (linkError) throw linkError;
    order += 1;
  }

  return { recipeId, skipped: false };
}

async function fetchMealSummariesForLetter(letter, limit) {
  const searchRes = await fetch(`${THEMEALDB_BASE}/search.php?f=${encodeURIComponent(letter)}`);
  const searchJson = await searchRes.json();
  const meals = searchJson.meals || [];
  return meals.slice(0, limit);
}

async function main() {
  loadLocalEnv();

  const args = parseArgs(process.argv);
  const noTranslate = args.get('no-translate') === 'true' || args.get('no-translate') === '';
  const allLettersFlag = args.get('all-letters') === 'true' || args.get('all-letters') === '';
  const lettersCsv = args.get('letters');
  const singleLetter = (args.get('letter') || 'a').slice(0, 1).toLowerCase();
  const countSingle = Math.min(50, Math.max(1, Number(args.get('count') || 10)));
  const perLetter = Math.min(50, Math.max(1, Number(args.get('per-letter') || 8)));
  const maxTotal = Math.min(800, Math.max(1, Number(args.get('max-total') || 500)));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      'Faltan credenciales: añade en .env SUPABASE_URL (o EXPO_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY.',
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  /** @type {{ idMeal: string }[]} */
  let queue = [];

  if (lettersCsv) {
    const letters = lettersCsv
      .split(',')
      .map((s) => s.trim().toLowerCase().slice(0, 1))
      .filter(Boolean);
    for (const L of letters) {
      await sleep(250);
      const part = await fetchMealSummariesForLetter(L, perLetter);
      queue.push(...part);
    }
  } else if (allLettersFlag) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    for (const L of alphabet) {
      await sleep(250);
      const part = await fetchMealSummariesForLetter(L, perLetter);
      queue.push(...part);
      if (queue.length >= maxTotal * 2) {
        break;
      }
    }
  } else {
    queue = await fetchMealSummariesForLetter(singleLetter, countSingle);
  }

  const seen = new Set();
  const unique = [];
  for (const item of queue) {
    if (!item?.idMeal || seen.has(item.idMeal)) {
      continue;
    }
    seen.add(item.idMeal);
    unique.push(item);
    if (unique.length >= maxTotal) {
      break;
    }
  }

  if (unique.length === 0) {
    console.error('No se obtuvieron recetas de TheMealDB. Prueba otras letras o revisa la red.');
    process.exit(1);
  }

  console.log(`Importando hasta ${unique.length} recetas (tope max-total=${maxTotal})…`);

  let ok = 0;
  for (const summary of unique) {
    await sleep(180);
    const lookupRes = await fetch(`${THEMEALDB_BASE}/lookup.php?i=${summary.idMeal}`);
    const lookupJson = await lookupRes.json();
    const meal = lookupJson.meals?.[0];
    if (!meal) continue;
    try {
      const result = await upsertRecipeFromMeal(supabase, meal, { translate: !noTranslate });
      if (!result.skipped) {
        ok += 1;
        console.log('OK', meal.strMeal);
      }
    } catch (e) {
      console.error('Error', meal.strMeal, e.message || e);
    }
  }

  console.log(`Hecho. Recetas importadas o actualizadas: ${ok}/${unique.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
