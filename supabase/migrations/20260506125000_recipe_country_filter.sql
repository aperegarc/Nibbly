-- País/cocina de la receta para filtros en el feed

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS cuisine_country text;

ALTER TABLE public.recipes
  DROP CONSTRAINT IF EXISTS recipes_cuisine_country_length;

ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_cuisine_country_length CHECK (
    cuisine_country IS NULL OR char_length(trim(cuisine_country)) BETWEEN 1 AND 80
  );

CREATE INDEX IF NOT EXISTS recipes_published_country_idx
  ON public.recipes (cuisine_country)
  WHERE is_published = true;

