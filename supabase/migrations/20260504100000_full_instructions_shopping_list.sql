-- Instrucciones completas (texto largo) y lista de la compra por usuario.
-- Idempotente: se puede re-ejecutar en SQL Editor sin fallar si ya existen objetos.

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS full_instructions text;

COMMENT ON COLUMN public.recipes.full_instructions IS 'Instrucciones completas de la receta (p. ej. en español).';

ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_full_instructions_length_chk;

ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_full_instructions_length_chk
  CHECK (
    full_instructions IS NULL
    OR char_length(full_instructions) <= 50000
  );

-- ---------------------------------------------------------------------------
-- Lista de la compra (ítems por usuario)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  label text NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shopping_list_items_label_trimmed CHECK (label = trim(label)),
  CONSTRAINT shopping_list_items_label_length CHECK (char_length(label) BETWEEN 1 AND 200),
  CONSTRAINT shopping_list_items_sort_non_negative CHECK (sort_order >= 0)
);

COMMENT ON TABLE public.shopping_list_items IS 'Ítems de lista de compra del usuario; checked = tachado en UI.';

CREATE INDEX IF NOT EXISTS shopping_list_items_user_sort_idx
  ON public.shopping_list_items (user_id, sort_order, created_at);

ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shopping_list_select_own ON public.shopping_list_items;
DROP POLICY IF EXISTS shopping_list_insert_own ON public.shopping_list_items;
DROP POLICY IF EXISTS shopping_list_update_own ON public.shopping_list_items;
DROP POLICY IF EXISTS shopping_list_delete_own ON public.shopping_list_items;

CREATE POLICY shopping_list_select_own
  ON public.shopping_list_items
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY shopping_list_insert_own
  ON public.shopping_list_items
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY shopping_list_update_own
  ON public.shopping_list_items
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY shopping_list_delete_own
  ON public.shopping_list_items
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shopping_list_items TO authenticated;
