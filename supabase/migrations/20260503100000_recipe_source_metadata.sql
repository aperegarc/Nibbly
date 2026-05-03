-- Metadatos de procedencia para cumplir atribución y permitir re-importar/actualizar por ID externo.

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS data_source_name text,
  ADD COLUMN IF NOT EXISTS data_source_url text;

COMMENT ON COLUMN public.recipes.external_id IS 'Identificador en el proveedor (ej. idMeal de TheMealDB).';
COMMENT ON COLUMN public.recipes.data_source_name IS 'Nombre legible del proveedor de datos (ej. TheMealDB).';
COMMENT ON COLUMN public.recipes.data_source_url IS 'URL de atribución o del proveedor.';

CREATE UNIQUE INDEX IF NOT EXISTS recipes_data_source_external_uidx
  ON public.recipes (data_source_name, external_id)
  WHERE data_source_name IS NOT NULL
    AND external_id IS NOT NULL;
