-- Smart Recipe Scroll — esquema inicial (PostgreSQL / Supabase)
-- Aplicar en: SQL Editor del dashboard o `supabase db push` con CLI.

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------------
CREATE TYPE public.diet_type AS ENUM (
  'balanced',
  'vegan',
  'vegetarian',
  'keto',
  'paleo',
  'gluten_free'
);

CREATE TYPE public.recipe_difficulty AS ENUM (
  'easy',
  'medium',
  'hard'
);

-- ---------------------------------------------------------------------------
-- Perfil de aplicación (1:1 con auth.users). Equivale a “users” de negocio.
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  diet public.diet_type NOT NULL DEFAULT 'balanced',
  allergies text[] NOT NULL DEFAULT '{}'::text[],
  preferences text[] NOT NULL DEFAULT '{}'::text[],
  onboarding_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_display_name_length CHECK (
    display_name IS NULL OR char_length(trim(display_name)) <= 120
  ),
  CONSTRAINT profiles_allergies_max CHECK (cardinality(allergies) <= 50),
  CONSTRAINT profiles_preferences_max CHECK (cardinality(preferences) <= 50)
);

COMMENT ON TABLE public.profiles IS 'Datos de onboarding y preferencias; una fila por usuario de Auth.';

CREATE INDEX profiles_onboarding_completed_at_idx
  ON public.profiles (onboarding_completed_at)
  WHERE onboarding_completed_at IS NULL;

-- ---------------------------------------------------------------------------
-- Recetas (catálogo; escritura vía service_role o políticas futuras)
-- ---------------------------------------------------------------------------
CREATE TABLE public.recipes (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  quick_steps text[] NOT NULL DEFAULT '{}'::text[],
  cook_time_minutes integer NOT NULL,
  difficulty public.recipe_difficulty NOT NULL,
  diet_type public.diet_type NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recipes_title_length CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  CONSTRAINT recipes_quick_steps_max CHECK (cardinality(quick_steps) <= 40),
  CONSTRAINT recipes_cook_time_positive CHECK (cook_time_minutes > 0 AND cook_time_minutes <= 10080),
  CONSTRAINT recipes_image_url_length CHECK (char_length(image_url) <= 2048)
);

COMMENT ON TABLE public.recipes IS 'Recetas publicables; filtrado por dieta, tiempo y dificultad.';

CREATE INDEX recipes_published_diet_cook_diff_idx
  ON public.recipes (diet_type, cook_time_minutes, difficulty)
  WHERE is_published = true;

CREATE INDEX recipes_published_created_at_idx
  ON public.recipes (created_at DESC)
  WHERE is_published = true;

-- ---------------------------------------------------------------------------
-- Ingredientes normalizados
-- ---------------------------------------------------------------------------
CREATE TABLE public.ingredients (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ingredients_name_length CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  CONSTRAINT ingredients_name_trimmed CHECK (name = trim(name))
);

COMMENT ON TABLE public.ingredients IS 'Catálogo de ingredientes; name en forma canónica (trim).';

CREATE UNIQUE INDEX ingredients_name_lower_unique_idx
  ON public.ingredients (lower(name));

-- ---------------------------------------------------------------------------
-- recipe_ingredients (N:M con orden y cantidad opcional)
-- ---------------------------------------------------------------------------
CREATE TABLE public.recipe_ingredients (
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients (id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 0,
  quantity_numeric numeric(12, 4),
  quantity_text text,
  PRIMARY KEY (recipe_id, ingredient_id),
  CONSTRAINT recipe_ingredients_sort_order_non_negative CHECK (sort_order >= 0),
  CONSTRAINT recipe_ingredients_quantity_text_length CHECK (
    quantity_text IS NULL OR char_length(quantity_text) <= 80
  )
);

COMMENT ON TABLE public.recipe_ingredients IS 'Relación receta-ingrediente con orden de listado.';

CREATE INDEX recipe_ingredients_ingredient_id_idx
  ON public.recipe_ingredients (ingredient_id);

CREATE INDEX recipe_ingredients_recipe_sort_idx
  ON public.recipe_ingredients (recipe_id, sort_order);

-- ---------------------------------------------------------------------------
-- Favoritos por usuario
-- ---------------------------------------------------------------------------
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);

COMMENT ON TABLE public.favorites IS 'Recetas guardadas por usuario.';

CREATE INDEX favorites_user_id_created_at_idx
  ON public.favorites (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER recipes_set_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Perfil por defecto al registrarse (Auth)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- profiles: solo el propio usuario
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- recipes: lectura de publicadas (cliente autenticado)
CREATE POLICY recipes_select_published
  ON public.recipes
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- ingredients: lectura para usuarios autenticados (catálogo)
CREATE POLICY ingredients_select_authenticated
  ON public.ingredients
  FOR SELECT
  TO authenticated
  USING (true);

-- recipe_ingredients: solo filas cuya receta está publicada
CREATE POLICY recipe_ingredients_select_published
  ON public.recipe_ingredients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND r.is_published = true
    )
  );

-- favorites: CRUD solo sobre filas propias
CREATE POLICY favorites_select_own
  ON public.favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY favorites_insert_own
  ON public.favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY favorites_delete_own
  ON public.favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Permisos (API Supabase: roles anon / authenticated / service_role)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.recipes TO authenticated;
GRANT SELECT ON TABLE public.ingredients TO authenticated;
GRANT SELECT ON TABLE public.recipe_ingredients TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.favorites TO authenticated;

