-- Plan semanal: hasta 3 comidas por día (desayuno, comida, cena), por usuario.

CREATE TABLE IF NOT EXISTS public.weekly_menu_slots (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,
  meal_type text NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day_of_week, meal_type),
  CONSTRAINT weekly_menu_slots_day_chk CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT weekly_menu_slots_meal_chk CHECK (meal_type IN ('breakfast', 'lunch', 'dinner'))
);

COMMENT ON TABLE public.weekly_menu_slots IS 'Asignación semanal: Lunes=0 … Domingo=6; comidas breakfast/lunch/dinner.';

CREATE INDEX IF NOT EXISTS weekly_menu_slots_user_idx ON public.weekly_menu_slots (user_id);

DROP TRIGGER IF EXISTS weekly_menu_slots_set_updated_at ON public.weekly_menu_slots;

CREATE TRIGGER weekly_menu_slots_set_updated_at
  BEFORE UPDATE ON public.weekly_menu_slots
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.weekly_menu_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_menu_select_own ON public.weekly_menu_slots;
DROP POLICY IF EXISTS weekly_menu_insert_own ON public.weekly_menu_slots;
DROP POLICY IF EXISTS weekly_menu_update_own ON public.weekly_menu_slots;
DROP POLICY IF EXISTS weekly_menu_delete_own ON public.weekly_menu_slots;

CREATE POLICY weekly_menu_select_own
  ON public.weekly_menu_slots
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY weekly_menu_insert_own
  ON public.weekly_menu_slots
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY weekly_menu_update_own
  ON public.weekly_menu_slots
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY weekly_menu_delete_own
  ON public.weekly_menu_slots
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.weekly_menu_slots TO authenticated;
