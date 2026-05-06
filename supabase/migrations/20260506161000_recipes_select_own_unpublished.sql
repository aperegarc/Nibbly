-- Permite que cada usuario vea sus recetas privadas (no publicadas).

DROP POLICY IF EXISTS recipes_select_own_created ON public.recipes;

CREATE POLICY recipes_select_own_created
  ON public.recipes
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());
