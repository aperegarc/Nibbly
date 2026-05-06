/**
 * Tipos generados recomendados: `supabase gen types typescript --project-id <id>`
 * Este stub permite tipar el cliente hasta que exista el codegen.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          diet: string;
          allergies: string[];
          preferences: string[];
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          diet?: string;
          allergies?: string[];
          preferences?: string[];
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          diet?: string;
          allergies?: string[];
          preferences?: string[];
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          image_url: string;
          quick_steps: string[];
          full_instructions: string | null;
          cook_time_minutes: number;
          difficulty: string;
          diet_type: string;
          cuisine_country: string | null;
          is_published: boolean;
          external_id: string | null;
          data_source_name: string | null;
          data_source_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          image_url: string;
          quick_steps?: string[];
          full_instructions?: string | null;
          cook_time_minutes: number;
          difficulty: string;
          diet_type: string;
          cuisine_country?: string | null;
          is_published?: boolean;
          external_id?: string | null;
          data_source_name?: string | null;
          data_source_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          image_url?: string;
          quick_steps?: string[];
          full_instructions?: string | null;
          cook_time_minutes?: number;
          difficulty?: string;
          diet_type?: string;
          cuisine_country?: string | null;
          is_published?: boolean;
          external_id?: string | null;
          data_source_name?: string | null;
          data_source_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ingredients: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          recipe_id: string;
          ingredient_id: string;
          sort_order: number;
          quantity_numeric: string | null;
          quantity_text: string | null;
        };
        Insert: {
          recipe_id: string;
          ingredient_id: string;
          sort_order?: number;
          quantity_numeric?: string | null;
          quantity_text?: string | null;
        };
        Update: {
          recipe_id?: string;
          ingredient_id?: string;
          sort_order?: number;
          quantity_numeric?: string | null;
          quantity_text?: string | null;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
          user_id: string;
          recipe_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          recipe_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          recipe_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      recipe_dislikes: {
        Row: {
          user_id: string;
          recipe_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          recipe_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          recipe_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      recipe_events: {
        Row: {
          id: string;
          user_id: string;
          recipe_id: string;
          event_type: string;
          meta: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipe_id: string;
          event_type: string;
          meta?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recipe_id?: string;
          event_type?: string;
          meta?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      shopping_list_items: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          checked: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          checked?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          checked?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      weekly_menu_slots: {
        Row: {
          user_id: string;
          day_of_week: number;
          meal_type: string;
          recipe_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          day_of_week: number;
          meal_type: string;
          recipe_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          day_of_week?: number;
          meal_type?: string;
          recipe_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      diet_type: string;
      recipe_difficulty: string;
    };
    CompositeTypes: Record<string, never>;
  };
};
