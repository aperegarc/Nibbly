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

const AREA_TO_ES = {
  American: 'Estados Unidos',
  British: 'Reino Unido',
  Canadian: 'Canadá',
  Chinese: 'China',
  Croatian: 'Croacia',
  Dutch: 'Países Bajos',
  Egyptian: 'Egipto',
  Filipino: 'Filipinas',
  French: 'Francia',
  Greek: 'Grecia',
  Indian: 'India',
  Irish: 'Irlanda',
  Italian: 'Italia',
  Jamaican: 'Jamaica',
  Japanese: 'Japón',
  Kenyan: 'Kenia',
  Malaysian: 'Malasia',
  Mexican: 'México',
  Moroccan: 'Marruecos',
  Polish: 'Polonia',
  Portuguese: 'Portugal',
  Russian: 'Rusia',
  Spanish: 'España',
  Thai: 'Tailandia',
  Tunisian: 'Túnez',
  Turkish: 'Turquía',
  Ukrainian: 'Ucrania',
  Uruguayan: 'Uruguay',
  Vietnamese: 'Vietnam',
};

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

function normalizeText(value) {
  return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function containsAny(haystack, needles) {
  return needles.some((token) => haystack.includes(token));
}

function inferDietType({ category, title, instructions, ingredients }) {
  const blob = normalizeText([category, title, instructions, ...(ingredients || [])].join(' '));

  if (containsAny(blob, ['keto', 'low carb', 'low-carb'])) return 'keto';
  if (containsAny(blob, ['paleo'])) return 'paleo';
  if (containsAny(blob, ['gluten free', 'gluten-free', 'sin gluten'])) return 'gluten_free';

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

  if (containsAny(blob, ['vegan'])) return 'vegan';
  if (containsAny(blob, ['vegetarian'])) return 'vegetarian';
  if (!containsAny(blob, meatOrFish)) {
    if (!containsAny(blob, dairyOrEggOrHoney)) {
      return 'vegan';
    }
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
    const boundedTotal = Math.min(explicitTotal, explicitMax + 45);
    estimated = Math.max(estimated, boundedTotal);
  }

  return Math.min(240, Math.max(10, estimated));
}

function mapDifficultyFromSignals({ cookTimeMinutes, stepCount, ingredientCount }) {
  const complexity = stepCount + Math.ceil(ingredientCount / 3);
  if (cookTimeMinutes > 75 || complexity >= 14) return 'hard';
  if (cookTimeMinutes <= 25 && complexity <= 7) return 'easy';
  return 'medium';
}

function quickStepsFromInstructions(text) {
  if (!text) return ['Sin instrucciones detalladas.'];
  const lines = text
    .split(/\r?\n/)
    .map((l) => normalizeInstructionLine(l))
    .filter((l) => l.length > 0);
  const merged =
    lines.length > 0
      ? lines
      : text
          .split('.')
          .map((l) => normalizeInstructionLine(l))
          .filter(Boolean);
  const deduped = [];
  const seen = new Set();
  for (const step of merged) {
    const key = step.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(step);
  }
  return deduped.slice(0, 14);
}

function stripStepPrefix(value) {
  const v = (value || '').trim();
  if (!v) {
    return '';
  }
  return v
    .replace(/^step\s*\d+\s*[:.)-]?\s*/i, '')
    .replace(/^paso\s*\d+\s*[:.)-]?\s*/i, '')
    .replace(/^(\d+)\s*[:.)-]\s*/, '')
    .trim();
}

function normalizeInstructionLine(value) {
  const raw = (value || '').trim();
  if (!raw) {
    return '';
  }
  if (/^(?:step|paso)\s*\d+\s*[:.)-]?\s*$/i.test(raw)) {
    return '';
  }

  let cleaned = raw.replace(/\s+/g, ' ').trim();

  // Quita encabezados repetidos tipo "Paso 1 Paso 1 ..." o "Step 2: Step 2: ..."
  for (let i = 0; i < 4; i += 1) {
    const next = cleaned.replace(/^(?:step|paso)\s*\d+\s*[:.)-]?\s*/i, '').trim();
    if (next === cleaned) {
      break;
    }
    cleaned = next;
  }

  cleaned = stripStepPrefix(cleaned);
  if (/^(?:step|paso)\s*\d+\s*[:.)-]?\s*$/i.test(cleaned)) {
    return '';
  }
  return cleaned;
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

async function translateChunkGoogle(text) {
  const url =
    'https://translate.googleapis.com/translate_a/single' +
    `?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GoogleTranslate HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!Array.isArray(json) || !Array.isArray(json[0])) {
    return text;
  }
  const translated = json[0]
    .map((piece) => (Array.isArray(piece) && typeof piece[0] === 'string' ? piece[0] : ''))
    .join('')
    .trim();
  return translated || text;
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
      try {
        out.push(await translateChunkGoogle(chunk));
        console.warn('Traducción por fallback Google (Libre no disponible):', e.message || e);
      } catch (e2) {
        console.warn('Traducción (fragmento) no disponible, se deja EN:', e2.message || e2);
        out.push(chunk);
      }
    }
  }
  return out.join('\n\n').trim();
}

async function translateIngredientNamesToSpanish(names, opts) {
  const out = [];
  for (const name of names) {
    const translated = await translateToSpanish(name, opts);
    out.push((translated || name).trim());
    await sleep(opts?.enabled ? 120 : 0);
  }
  return uniqueIngredientNamesPreserveOrder(out);
}

function mapAreaToSpanish(area) {
  const raw = (area || '').trim();
  if (!raw) {
    return null;
  }
  return AREA_TO_ES[raw] ?? raw;
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

  const ingredientNamesRaw = uniqueIngredientNamesPreserveOrder(ingredientNamesFromMeal(meal));
  const ingredientNames = await translateIngredientNamesToSpanish(ingredientNamesRaw, {
    enabled: translateEnabled,
    apiKey,
    baseUrl,
  });
  const bodyForStepsRaw = instructionsEs || instructions;
  const bodyForSteps = bodyForStepsRaw
    .split(/\r?\n/)
    .map((line) => normalizeInstructionLine(line))
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const quickSteps = quickStepsFromInstructions(bodyForSteps);
  const dietType = inferDietType({
    category: meal.strCategory,
    title,
    instructions,
    ingredients: ingredientNamesRaw,
  });
  const cookTimeMinutes = estimateCookTimeMinutes({
    instructions,
    ingredientCount: ingredientNamesRaw.length,
    stepCount: quickSteps.length,
  });
  const difficulty = mapDifficultyFromSignals({
    cookTimeMinutes,
    stepCount: quickSteps.length,
    ingredientCount: ingredientNamesRaw.length,
  });

  const row = {
    title: titleEs || title,
    description: null,
    image_url: imageUrl,
    quick_steps: quickSteps,
    full_instructions: bodyForSteps.trim() ? bodyForSteps.trim() : null,
    cook_time_minutes: cookTimeMinutes,
    difficulty,
    diet_type: dietType,
    cuisine_country: mapAreaToSpanish(meal.strArea),
    is_published: true,
    external_id: externalId,
    data_source_name: SOURCE_NAME,
    data_source_url: SOURCE_URL,
  };
  const rowWithoutCountry = { ...row };
  delete rowWithoutCountry.cuisine_country;

  const { data: existing } = await supabase
    .from('recipes')
    .select('id')
    .eq('data_source_name', SOURCE_NAME)
    .eq('external_id', externalId)
    .maybeSingle();

  let recipeId = existing?.id;

  if (recipeId) {
    let { error } = await supabase.from('recipes').update(row).eq('id', recipeId);
    if (
      error &&
      typeof error.message === 'string' &&
      error.message.includes("'cuisine_country' column")
    ) {
      ({ error } = await supabase.from('recipes').update(rowWithoutCountry).eq('id', recipeId));
    }
    if (error) throw error;
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
  } else {
    let { data: inserted, error } = await supabase.from('recipes').insert(row).select('id').single();
    if (
      error &&
      typeof error.message === 'string' &&
      error.message.includes("'cuisine_country' column")
    ) {
      ({ data: inserted, error } = await supabase
        .from('recipes')
        .insert(rowWithoutCountry)
        .select('id')
        .single());
    }
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
