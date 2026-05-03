export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type FeedStackParamList = {
  FeedHome: undefined;
  RecipeSearch: undefined;
  RecipeDetail: { recipeId: string };
  CookingMode: { recipeId: string };
};

export type FavoritesStackParamList = {
  FavoritesHome: undefined;
  RecipeDetail: { recipeId: string };
  CookingMode: { recipeId: string };
};

export type WeeklyStackParamList = {
  WeeklyHome: undefined;
  RecipeDetail: { recipeId: string };
  CookingMode: { recipeId: string };
};

export type MainTabParamList = {
  FeedTab: undefined;
  FavoritesTab: undefined;
  ShoppingTab: undefined;
  WeeklyTab: undefined;
};

export type AppStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};
