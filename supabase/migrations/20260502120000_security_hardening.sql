-- Paso 6: endurecimiento (RLS estricto + forma de arrays en perfil)
-- Ejecutar después de la migración inicial.

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recipes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.favorites FORCE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_allergies_element_shape CHECK (
    NOT EXISTS (
      SELECT 1
      FROM unnest(coalesce(allergies, '{}'::text[])) AS t(value)
      WHERE char_length(value) > 80
        OR char_length(trim(value)) < 1
    )
  );

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferences_element_shape CHECK (
    NOT EXISTS (
      SELECT 1
      FROM unnest(coalesce(preferences, '{}'::text[])) AS t(value)
      WHERE char_length(value) > 80
        OR char_length(trim(value)) < 1
    )
  );
