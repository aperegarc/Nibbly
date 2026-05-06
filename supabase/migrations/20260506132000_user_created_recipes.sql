-- Permite a usuarios autenticados crear sus propias recetas en Favoritos.

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS recipes_created_by_idx ON public.recipes (created_by);

DROP POLICY IF EXISTS recipes_insert_own ON public.recipes;
DROP POLICY IF EXISTS recipes_update_own ON public.recipes;
DROP POLICY IF EXISTS recipes_delete_own ON public.recipes;

CREATE POLICY recipes_insert_own
  ON public.recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY recipes_update_own
  ON public.recipes
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY recipes_delete_own
  ON public.recipes
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

GRANT INSERT, UPDATE, DELETE ON TABLE public.recipes TO authenticated;

DROP POLICY IF EXISTS ingredients_insert_authenticated ON public.ingredients;

CREATE POLICY ingredients_insert_authenticated
  ON public.ingredients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

GRANT INSERT ON TABLE public.ingredients TO authenticated;

DROP POLICY IF EXISTS recipe_ingredients_insert_own_recipe ON public.recipe_ingredients;
DROP POLICY IF EXISTS recipe_ingredients_update_own_recipe ON public.recipe_ingredients;
DROP POLICY IF EXISTS recipe_ingredients_delete_own_recipe ON public.recipe_ingredients;

CREATE POLICY recipe_ingredients_insert_own_recipe
  ON public.recipe_ingredients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.created_by = auth.uid()
    )
  );

CREATE POLICY recipe_ingredients_update_own_recipe
  ON public.recipe_ingredients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.created_by = auth.uid()
    )
  );

CREATE POLICY recipe_ingredients_delete_own_recipe
  ON public.recipe_ingredients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.created_by = auth.uid()
    )
  );

GRANT INSERT, UPDATE, DELETE ON TABLE public.recipe_ingredients TO authenticated;
