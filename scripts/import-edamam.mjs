/**
 * Importación de recetas desde Edamam Recipe API v2.
 *
 * Uso:
 *   node scripts/import-edamam.mjs --queries=chicken,rice,eggs --max-total=300 --per-query=60
 *   node scripts/import-edamam.mjs --wipe-existing --queries=chicken,beef,fish --max-total=500
 *   node scripts/import-edamam.mjs --no-translate
 *
 * Variables requeridas:
 *   SUPABASE_URL (o EXPO_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   EDAMAM_APP_ID
 *   EDAMAM_APP_KEY
 *
 * Variables opcionales traducción:
 *   LIBRETRANSLATE_URL
 *   LIBRETRANSLATE_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const SOURCE_NAME = 'Edamam';
const SOURCE_URL = 'https://www.edamam.com';
const EDAMAM_BASE = 'https://api.edamam.com/api/recipes/v2';
const EDAMAM_SEARCH_BASE = 'https://api.edamam.com/search';
const LIBRETRANSLATE_DEFAULT = 'https://libretranslate.com';
const DEFAULT_QUERIES = ['chicken', 'rice', 'egg', 'beef', 'fish', 'pasta', 'salad', 'potato'];

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
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
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

function normalizeText(value) {
  return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function containsAny(haystack, needles) {
  return needles.some((token) => haystack.includes(token));
}

function inferDietTypeFromEdamam(recipe, ingredients) {
  const dietLabels = Array.isArray(recipe?.dietLabels) ? recipe.dietLabels.map((x) => normalizeText(x)) : [];
  const healthLabels = Array.isArray(recipe?.healthLabels) ? recipe.healthLabels.map((x) => normalizeText(x)) : [];
  const blob = normalizeText([recipe?.label || '', ...ingredients].join(' '));

  if (dietLabels.some((x) => x.includes('high-protein'))) return 'balanced';
  if (dietLabels.some((x) => x.includes('low-carb'))) return 'keto';
  if (healthLabels.some((x) => x.includes('keto'))) return 'keto';
  if (healthLabels.some((x) => x.includes('paleo'))) return 'paleo';
  if (healthLabels.some((x) => x.includes('gluten-free'))) return 'gluten_free';
  if (healthLabels.some((x) => x.includes('vegan'))) return 'vegan';
  if (healthLabels.some((x) => x.includes('vegetarian'))) return 'vegetarian';

  const meatOrFish = [
    'beef',
    'pork',
    'ham',
    'bacon',
    'chicken',
    'turkey',
    'lamb',
    'duck',
    'fish',
    'salmon',
    'tuna',
    'shrimp',
    'prawn',
    'anchovy',
    'sardine',
    'mussel',
    'clam',
    'squid',
  ];
  if (!containsAny(blob, meatOrFish)) {
    if (containsAny(blob, ['milk', 'cream', 'cheese', 'butter', 'egg', 'yogurt', 'honey'])) return 'vegetarian';
    return 'vegan';
  }
  return 'balanced';
}

function mapDifficulty(minutes, ingredientCount) {
  if (minutes > 75 || ingredientCount >= 14) return 'hard';
  if (minutes <= 25 && ingredientCount <= 8) return 'easy';
  return 'medium';
}

function guessQuickSteps(recipe) {
  const instructions = (recipe?.instructions || '').trim();
  if (instructions) {
    return instructions
      .split(/\r?\n|\.\s+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 14);
  }
  const lines = Array.isArray(recipe?.ingredientLines) ? recipe.ingredientLines : [];
  return [
    'Prepara todos los ingredientes.',
    `Combina ${Math.min(lines.length, 6)} ingredientes principales.`,
    'Cocina hasta el punto deseado.',
    'Sirve y disfruta.',
  ];
}

function chunkByLength(text, maxLen) {
  const t = (text || '').trim();
  if (!t) return [];
  if (t.length <= maxLen) return [t];
  const parts = [];
  let i = 0;
  while (i < t.length) {
    let end = Math.min(i + maxLen, t.length);
    if (end < t.length) {
      const slice = t.slice(i, end);
      const breakAt = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('. '));
      if (breakAt > maxLen * 0.35) end = i + breakAt + 1;
    }
    const piece = t.slice(i, end).trim();
    if (piece) parts.push(piece);
    i = end;
  }
  return parts;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
  if (!res.ok) throw new Error(`LibreTranslate HTTP ${res.status}`);
  const json = await res.json();
  return typeof json.translatedText === 'string' ? json.translatedText : text;
}

async function translateChunkGoogle(text) {
  const url =
    'https://translate.googleapis.com/translate_a/single' +
    `?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GoogleTranslate HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json) || !Array.isArray(json[0])) return text;
  const translated = json[0]
    .map((piece) => (Array.isArray(piece) && typeof piece[0] === 'string' ? piece[0] : ''))
    .join('')
    .trim();
  return translated || text;
}

async function translateToSpanish(text, { enabled, apiKey, baseUrl }) {
  const raw = (text || '').trim();
  if (!raw) return '';
  if (!enabled) return raw;
  const chunks = chunkByLength(raw, 3200);
  const out = [];
  for (const chunk of chunks) {
    await sleep(350);
    try {
      out.push(await translateChunkLibre(chunk, apiKey, baseUrl));
    } catch {
      try {
        out.push(await translateChunkGoogle(chunk));
      } catch {
        out.push(chunk);
      }
    }
  }
  return out.join('\n\n').trim();
}

async function ensureIngredient(supabase, name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Nombre de ingrediente vacío');

  const { data: foundExact } = await supabase.from('ingredients').select('id').eq('name', trimmed).maybeSingle();
  if (foundExact?.id) return foundExact.id;

  const { data: foundCi } = await supabase.from('ingredients').select('id').ilike('name', trimmed).maybeSingle();
  if (foundCi?.id) return foundCi.id;

  const { data: created, error } = await supabase.from('ingredients').insert({ name: trimmed }).select('id').single();
  if (error) {
    if (error.code === '23505') {
      const { data: retry } = await supabase.from('ingredients').select('id').ilike('name', trimmed).maybeSingle();
      if (retry?.id) return retry.id;
    }
    throw error;
  }
  return created.id;
}

async function wipeExistingRecipes(supabase) {
  const { error } = await supabase.from('recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;

  // Limpia ingredientes huérfanos para no arrastrar catálogo viejo.
  const { data: linkedRows, error: linkedError } = await supabase
    .from('recipe_ingredients')
    .select('ingredient_id');
  if (linkedError) {
    console.warn('No se pudieron leer relaciones recipe_ingredients:', linkedError.message || linkedError);
    return;
  }
  const linkedIds = [...new Set((linkedRows || []).map((r) => r.ingredient_id).filter(Boolean))];
  if (linkedIds.length === 0) {
    const { error: wipeIngError } = await supabase
      .from('ingredients')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (wipeIngError) {
      console.warn('No se pudieron limpiar ingredientes huérfanos:', wipeIngError.message || wipeIngError);
    }
    return;
  }
  const quoted = linkedIds.map((id) => `'${id}'`).join(',');
  const { error: orphanError } = await supabase.from('ingredients').delete().not('id', 'in', `(${quoted})`);
  if (orphanError) {
    console.warn('No se pudieron limpiar ingredientes huérfanos:', orphanError.message || orphanError);
  }
}

async function fetchEdamamHitsV2({ appId, appKey, query, limit }) {
  const hits = [];
  let nextUrl =
    `${EDAMAM_BASE}?type=public&q=${encodeURIComponent(query)}` +
    `&app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}&random=true`;
  let safety = 0;

  while (nextUrl && hits.length < limit && safety < 15) {
    safety += 1;
    const res = await fetch(nextUrl);
    if (!res.ok) throw new Error(`Edamam HTTP ${res.status} para query "${query}"`);
    const json = await res.json();
    const pageHits = Array.isArray(json?.hits) ? json.hits : [];
    for (const h of pageHits) {
      if (h?.recipe) hits.push(h.recipe);
      if (hits.length >= limit) break;
    }
    nextUrl = json?._links?.next?.href || null;
    await sleep(180);
  }
  return hits;
}

async function fetchEdamamHitsSearch({ appId, appKey, query, limit }) {
  const hits = [];
  let from = 0;
  const pageSize = 100;
  let safety = 0;

  while (hits.length < limit && safety < 20) {
    safety += 1;
    const to = Math.min(from + pageSize, from + Math.max(1, limit - hits.length));
    const url =
      `${EDAMAM_SEARCH_BASE}?q=${encodeURIComponent(query)}` +
      `&app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}` +
      `&from=${from}&to=${to}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Edamam /search HTTP ${res.status} para query "${query}"`);
    }
    const json = await res.json();
    const pageHits = Array.isArray(json?.hits) ? json.hits : [];
    if (pageHits.length === 0) {
      break;
    }
    for (const h of pageHits) {
      if (h?.recipe) hits.push(h.recipe);
      if (hits.length >= limit) break;
    }
    from = to;
    await sleep(180);
  }
  return hits;
}

async function fetchEdamamHits({ appId, appKey, query, limit }) {
  try {
    return await fetchEdamamHitsV2({ appId, appKey, query, limit });
  } catch (e) {
    const msg = String(e?.message || e);
    if (
      msg.includes('HTTP 401') ||
      msg.includes('HTTP 403') ||
      msg.includes('HTTP 404')
    ) {
      console.warn(`Edamam v2 no disponible (${msg}). Fallback a /search...`);
      return fetchEdamamHitsSearch({ appId, appKey, query, limit });
    }
    throw e;
  }
}

async function upsertEdamamRecipe(supabase, recipe, translateOptions) {
  const externalId = String(recipe?.uri || '').trim();
  const title = String(recipe?.label || '').trim();
  const imageUrl = String(recipe?.image || '').trim();
  if (!externalId || !title || !imageUrl) return { skipped: true };

  const ingredientLinesRaw = Array.isArray(recipe?.ingredientLines)
    ? recipe.ingredientLines.map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  const ingredientLinesUnique = [...new Set(ingredientLinesRaw.map((x) => x.toLowerCase()))]
    .map((k) => ingredientLinesRaw.find((x) => x.toLowerCase() === k))
    .filter(Boolean);

  const titleEs = await translateToSpanish(title, translateOptions);
  const ingredientLinesEs = [];
  for (const line of ingredientLinesUnique) {
    ingredientLinesEs.push((await translateToSpanish(line, translateOptions)) || line);
    await sleep(60);
  }
  const quickSteps = guessQuickSteps(recipe);
  const quickStepsEs = [];
  for (const step of quickSteps) {
    quickStepsEs.push((await translateToSpanish(step, translateOptions)) || step);
  }

  const cookTimeMinutes = Number.isFinite(recipe?.totalTime) && recipe.totalTime > 0
    ? Math.min(240, Math.max(10, Math.round(recipe.totalTime)))
    : Math.min(240, Math.max(10, 10 + ingredientLinesEs.length * 3));

  const dietType = inferDietTypeFromEdamam(recipe, ingredientLinesUnique);
  const difficulty = mapDifficulty(cookTimeMinutes, ingredientLinesEs.length);
  const cuisineCountry = Array.isArray(recipe?.cuisineType) && recipe.cuisineType[0]
    ? String(recipe.cuisineType[0])
    : null;

  const row = {
    title: titleEs || title,
    description: null,
    image_url: imageUrl,
    quick_steps: quickStepsEs.slice(0, 14),
    full_instructions: null,
    cook_time_minutes: cookTimeMinutes,
    difficulty,
    diet_type: dietType,
    cuisine_country: cuisineCountry,
    is_published: true,
    external_id: externalId,
    data_source_name: SOURCE_NAME,
    data_source_url: String(recipe?.url || SOURCE_URL),
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
  for (const ing of ingredientLinesEs) {
    const ingredientId = await ensureIngredient(supabase, ing);
    const { error: linkError } = await supabase.from('recipe_ingredients').insert({
      recipe_id: recipeId,
      ingredient_id: ingredientId,
      sort_order: order,
    });
    if (linkError) throw linkError;
    order += 1;
  }

  return { skipped: false, recipeId };
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv);

  const noTranslate = args.get('no-translate') === 'true' || args.get('no-translate') === '';
  const wipeExisting = args.get('wipe-existing') === 'true' || args.get('wipe-existing') === '';
  const maxTotal = Math.min(1200, Math.max(1, Number(args.get('max-total') || 300)));
  const perQuery = Math.min(250, Math.max(1, Number(args.get('per-query') || 60)));
  const queries = (args.get('queries') || DEFAULT_QUERIES.join(','))
    .split(',')
    .map((q) => q.trim())
    .filter(Boolean);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const edamamAppId = process.env.EDAMAM_APP_ID;
  const edamamAppKey = process.env.EDAMAM_APP_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Faltan SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env');
    process.exit(1);
  }
  if (!edamamAppId || !edamamAppKey) {
    console.error('Faltan EDAMAM_APP_ID y EDAMAM_APP_KEY en .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const translateOptions = {
    enabled: !noTranslate,
    apiKey: process.env.LIBRETRANSLATE_API_KEY || '',
    baseUrl: process.env.LIBRETRANSLATE_URL || LIBRETRANSLATE_DEFAULT,
  };

  const collected = [];
  const seen = new Set();

  for (const query of queries) {
    if (collected.length >= maxTotal) break;
    console.log(`Buscando en Edamam: "${query}"`);
    const hits = await fetchEdamamHits({ appId: edamamAppId, appKey: edamamAppKey, query, limit: perQuery });
    for (const recipe of hits) {
      const ext = String(recipe?.uri || '').trim();
      if (!ext || seen.has(ext)) continue;
      seen.add(ext);
      collected.push(recipe);
      if (collected.length >= maxTotal) break;
    }
  }

  if (collected.length === 0) {
    throw new Error('Edamam no devolvió recetas con los filtros actuales.');
  }

  if (wipeExisting) {
    console.log('Borrando recetas actuales...');
    await wipeExistingRecipes(supabase);
    console.log('Recetas actuales eliminadas.');
  }

  console.log(`Importando ${collected.length} recetas desde Edamam...`);
  let ok = 0;
  for (const recipe of collected) {
    try {
      const result = await upsertEdamamRecipe(supabase, recipe, translateOptions);
      if (!result.skipped) {
        ok += 1;
        console.log('OK', recipe.label);
      }
    } catch (e) {
      console.warn('Error importando', recipe?.label || '(sin título)', e.message || e);
    }
    await sleep(120);
  }

  console.log(`Hecho. Recetas importadas/actualizadas desde Edamam: ${ok}/${collected.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

