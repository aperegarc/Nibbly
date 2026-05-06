-- Eventos mínimos de uso de recetas para retención/recomendaciones.

CREATE TABLE IF NOT EXISTS public.recipe_events (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recipe_events_type_length CHECK (char_length(event_type) BETWEEN 2 AND 60)
);

CREATE INDEX IF NOT EXISTS recipe_events_user_created_idx
  ON public.recipe_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS recipe_events_recipe_created_idx
  ON public.recipe_events (recipe_id, created_at DESC);

ALTER TABLE public.recipe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recipe_events_select_own ON public.recipe_events;
DROP POLICY IF EXISTS recipe_events_insert_own ON public.recipe_events;
DROP POLICY IF EXISTS recipe_events_delete_own ON public.recipe_events;

CREATE POLICY recipe_events_select_own
  ON public.recipe_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY recipe_events_insert_own
  ON public.recipe_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY recipe_events_delete_own
  ON public.recipe_events
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON TABLE public.recipe_events TO authenticated;
