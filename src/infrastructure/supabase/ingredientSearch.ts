import { getSupabaseClient } from './client';

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Búsqueda de nombres canónicos del catálogo (tabla `ingredients`).
 * Mínimo 2 caracteres en el caller para no saturar la tabla.
 */
export async function searchIngredientNames(query: string, limit = 15): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('ingredients')
    .select('name')
    .ilike('name', `%${escapeIlike(q)}%`)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => row.name.trim()).filter((name) => name.length > 0);
}
