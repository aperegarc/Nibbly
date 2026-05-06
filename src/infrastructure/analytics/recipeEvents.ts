import { getSupabaseClient } from '../supabase/client';

type EventMeta = Record<string, string | number | boolean | null>;

export async function trackRecipeEvent(params: {
  userId: string;
  recipeId: string;
  eventType: string;
  meta?: EventMeta;
}) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('recipe_events').insert({
    user_id: params.userId,
    recipe_id: params.recipeId,
    event_type: params.eventType,
    meta: params.meta ?? null,
  });
  if (error) {
    console.warn('trackRecipeEvent failed', error.message || error);
  }
}
