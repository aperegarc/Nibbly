-- Recetas publicadas cuyos ingredientes son todos un subconjunto de los ids dados
-- (la lista puede tener más ítems que la receta; basta con que la receta no use nada fuera de la lista).

CREATE OR REPLACE FUNCTION public.recipe_ids_ingredients_subset_of(p_ingredient_ids uuid[])
RETURNS TABLE (recipe_id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT r.id AS recipe_id
  FROM public.recipes r
  WHERE r.is_published = true
  AND EXISTS (SELECT 1 FROM public.recipe_ingredients ri0 WHERE ri0.recipe_id = r.id)
  AND NOT EXISTS (
    SELECT 1
    FROM public.recipe_ingredients ri
    WHERE ri.recipe_id = r.id
    AND NOT (ri.ingredient_id = ANY (COALESCE(p_ingredient_ids, ARRAY[]::uuid[])))
  );
$$;

COMMENT ON FUNCTION public.recipe_ids_ingredients_subset_of(uuid[]) IS
  'Recetas con al menos un ingrediente y tal que todo ingrediente de la receta está en p_ingredient_ids.';

GRANT EXECUTE ON FUNCTION public.recipe_ids_ingredients_subset_of(uuid[]) TO authenticated;
