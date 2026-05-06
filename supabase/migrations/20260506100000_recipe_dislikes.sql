-- No me gusta (feedback negativo) para personalización del feed

CREATE TABLE IF NOT EXISTS public.recipe_dislikes (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);

COMMENT ON TABLE public.recipe_dislikes IS 'Recetas ocultas del feed por feedback negativo del usuario.';

CREATE INDEX IF NOT EXISTS recipe_dislikes_user_id_created_at_idx
  ON public.recipe_dislikes (user_id, created_at DESC);

ALTER TABLE public.recipe_dislikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_dislikes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recipe_dislikes_select_own ON public.recipe_dislikes;
DROP POLICY IF EXISTS recipe_dislikes_insert_own ON public.recipe_dislikes;
DROP POLICY IF EXISTS recipe_dislikes_delete_own ON public.recipe_dislikes;

CREATE POLICY recipe_dislikes_select_own
  ON public.recipe_dislikes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY recipe_dislikes_insert_own
  ON public.recipe_dislikes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY recipe_dislikes_delete_own
  ON public.recipe_dislikes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON TABLE public.recipe_dislikes TO authenticated;

