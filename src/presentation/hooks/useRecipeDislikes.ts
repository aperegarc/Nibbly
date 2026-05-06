import { useCallback, useEffect, useMemo, useState } from 'react';

import { getSupabaseClient } from '../../infrastructure/supabase/client';

export function useRecipeDislikes(userId: string | undefined) {
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setDislikedIds(new Set());
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase as any)
      .from('recipe_dislikes')
      .select('recipe_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Dislikes', error);
      setLoading(false);
      return;
    }

    setDislikedIds(new Set((data ?? []).map((row: any) => row.recipe_id)));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isDisliked = useCallback(
    (recipeId: string) => {
      return dislikedIds.has(recipeId);
    },
    [dislikedIds],
  );

  const toggleDislike = useCallback(
    async (recipeId: string) => {
      if (!userId) {
        return;
      }

      const next = new Set(dislikedIds);
      const shouldRemove = next.has(recipeId);

      if (shouldRemove) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      setDislikedIds(next);

      try {
        const supabase = getSupabaseClient();
        if (shouldRemove) {
          await (supabase as any).from('recipe_dislikes').delete().eq('user_id', userId).eq('recipe_id', recipeId);
        } else {
          await (supabase as any).from('recipe_dislikes').insert({
            user_id: userId,
            recipe_id: recipeId,
          });
        }
      } catch (error) {
        console.error('Error al actualizar dislike', error);
        void refresh();
      }
    },
    [dislikedIds, refresh, userId],
  );

  const dislikedSignature = useMemo(() => {
    return [...dislikedIds].sort().join('|');
  }, [dislikedIds]);

  return {
    dislikedIds,
    dislikedSignature,
    isDisliked,
    toggleDislike,
    dislikesLoading: loading,
    refreshDislikes: refresh,
  };
}

