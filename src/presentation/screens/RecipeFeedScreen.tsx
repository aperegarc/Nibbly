import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAuth } from '../../app/providers/AuthProvider';
import { useDiscoveryPreferences } from '../../app/providers/DiscoveryPreferencesProvider';
import { useProfile } from '../../app/providers/ProfileProvider';
import { useShoppingList } from '../../app/providers/ShoppingListProvider';
import type { Recipe } from '../../domain/entities/Recipe';
import { getSupabaseClient } from '../../infrastructure/supabase/client';
import { FeedAppBar } from '../components/FeedAppBar';
import { RecipeFeedCard } from '../components/feed/RecipeFeedCard';
import { WhatToEatFeedCard } from '../components/feed/WhatToEatFeedCard';
import { FeedToolbar } from '../components/FeedToolbar';
import { RecipeFilterModal } from '../components/RecipeFilterModal';
import { useFavorites } from '../hooks/useFavorites';
import { useRecipeDislikes } from '../hooks/useRecipeDislikes';
import { useRecipeFeed } from '../hooks/useRecipeFeed';
import type { FeedStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type FeedItem = {
  recipe: Recipe;
  isFavorite: boolean;
  isDisliked: boolean;
};

type FeedListItem =
  | { kind: 'today'; id: string; pick: Recipe }
  | { kind: 'recipe'; recipe: Recipe; isFavorite: boolean; isDisliked: boolean };

export function RecipeFeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList, 'FeedHome'>>();
  const { session } = useAuth();
  const { profile } = useProfile();
  const discovery = useDiscoveryPreferences();
  const {
    items: shoppingItems,
    uncheckedLabels,
    useShoppingListForFeedFilter,
    setUseShoppingListForFeedFilter,
    addItems,
    listSchemaMissing,
  } = useShoppingList();
  const userId = session?.user.id;
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const estimatedChrome = 220;
  const [listViewportHeight, setListViewportHeight] = useState(() =>
    Math.max(280, windowHeight - insets.top - insets.bottom - estimatedChrome),
  );

  const [filterOpen, setFilterOpen] = useState(false);
  const listRef = useRef<FlatList<FeedListItem>>(null);
  const [missedRecipeIds, setMissedRecipeIds] = useState<string[]>([]);

  const preferences = useMemo(() => {
    if (!profile) {
      return null;
    }
    return {
      diet: profile.diet,
      allergies: profile.allergies,
      preferences: profile.preferences,
    };
  }, [profile]);

  const shoppingListIngredientNames = useMemo(
    () => (useShoppingListForFeedFilter ? uncheckedLabels : []),
    [uncheckedLabels, useShoppingListForFeedFilter],
  );

  const { recipes, status, errorMessage, refresh, loadMore } = useRecipeFeed({
    userId,
    preferences,
    filters: discovery.filters,
    shoppingListIngredientNames,
    shoppingListFilterActive: useShoppingListForFeedFilter,
  });

  const { isFavorite, toggleFavorite, favoriteIds } = useFavorites(userId);
  const favoriteSignature = useMemo(() => [...favoriteIds].sort().join('|'), [favoriteIds]);

  const { dislikedIds, dislikedSignature, isDisliked, toggleDislike } = useRecipeDislikes(userId);

  const visibleRecipes = useMemo(() => recipes.filter((r) => !dislikedIds.has(r.id)), [dislikedIds, recipes]);
  const feedItems = useMemo<FeedItem[]>(
    () =>
      visibleRecipes.map((recipe) => ({
        recipe,
        isFavorite: favoriteIds.has(recipe.id),
        isDisliked: dislikedIds.has(recipe.id),
      })),
    [dislikedIds, favoriteIds, visibleRecipes],
  );

  const topRecommendations = useMemo(() => feedItems.slice(0, 3), [feedItems]);

  const listItems = useMemo<FeedListItem[]>(() => {
    const recipeRows: FeedListItem[] = visibleRecipes.map((recipe) => ({
      kind: 'recipe',
      recipe,
      isFavorite: favoriteIds.has(recipe.id),
      isDisliked: dislikedIds.has(recipe.id),
    }));
    if (topRecommendations.length === 0) {
      return recipeRows;
    }
    const pick = topRecommendations[0]!.recipe;
    return [{ kind: 'today', id: '__what_to_eat_today__', pick }, ...recipeRows];
  }, [dislikedIds, favoriteIds, topRecommendations, visibleRecipes]);

  const shoppingSignature = useMemo(
    () =>
      [...shoppingItems.map((i) => i.label.trim().toLowerCase())]
        .filter((l) => l.length > 0)
        .sort()
        .join('|'),
    [shoppingItems],
  );

  const addRecipeIngredientsToList = useCallback(
    async (recipe: Recipe) => {
      if (listSchemaMissing) {
        Alert.alert('Lista no disponible', 'Ejecuta la migración de lista en Supabase y reintenta.');
        return;
      }
      if (recipe.ingredients.length === 0) {
        Alert.alert('Sin ingredientes', 'Esta receta no tiene ingredientes en catálogo.');
        return;
      }
      const existing = new Set(
        shoppingItems.map((i) => i.label.trim().toLowerCase()).filter((l) => l.length > 0),
      );
      const toAdd: string[] = [];
      for (const name of recipe.ingredients) {
        const t = name.trim();
        if (!t) {
          continue;
        }
        const k = t.toLowerCase();
        if (existing.has(k)) {
          continue;
        }
        existing.add(k);
        toAdd.push(t);
      }
      if (toAdd.length === 0) {
        Alert.alert('Nada nuevo', 'Todos los ingredientes de la receta ya están en tu lista.');
        return;
      }
      try {
        await addItems(toAdd);
        Alert.alert('Lista', `Se añadieron ${toAdd.length} ingrediente${toAdd.length === 1 ? '' : 's'}.`);
      } catch {
        Alert.alert('Error', 'No se pudo guardar en la lista.');
      }
    },
    [addItems, listSchemaMissing, shoppingItems],
  );

  const onFeedLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight <= 0) {
      return;
    }
    setListViewportHeight((prev) => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
  }, []);

  const handleToggleFavorite = useCallback(
    (recipeId: string) => {
      void toggleFavorite(recipeId);
    },
    [toggleFavorite],
  );

  const handleOpenDetail = useCallback(
    (recipeId: string) => {
      navigation.navigate('RecipeDetail', { recipeId });
    },
    [navigation],
  );

  const handleWhatToEatToday = useCallback(() => {
    if (topRecommendations.length === 0) {
      Alert.alert('Sin recetas', 'Ahora mismo no hay recomendaciones disponibles.');
      return;
    }
    const options = topRecommendations.map((item, index) => ({
      text: `${index + 1}. ${item.recipe.title} (${item.recipe.cookTimeMinutes} min)`,
      onPress: () => handleOpenDetail(item.recipe.id),
    }));
    Alert.alert('¿Qué como hoy?', 'Elige una opción recomendada para hoy:', [
      ...options,
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [handleOpenDetail, topRecommendations]);

  const renderItem = useCallback(
    ({ item }: { item: FeedListItem }) => {
      if (item.kind === 'today') {
        return (
          <WhatToEatFeedCard
            height={listViewportHeight}
            featuredRecipe={item.pick}
            onOpenOptions={handleWhatToEatToday}
            onOpenFeatured={() => handleOpenDetail(item.pick.id)}
          />
        );
      }
      return (
        <RecipeFeedCard
          recipe={item.recipe}
          height={listViewportHeight}
          isFavorite={item.isFavorite}
          isDisliked={item.isDisliked}
          onToggleFavorite={handleToggleFavorite}
          onToggleDislike={toggleDislike}
          onOpenDetail={handleOpenDetail}
          onAddMissingIngredientsToList={addRecipeIngredientsToList}
          shoppingListDisabled={listSchemaMissing}
        />
      );
    },
    [
      addRecipeIngredientsToList,
      handleOpenDetail,
      handleToggleFavorite,
      handleWhatToEatToday,
      listSchemaMissing,
      listViewportHeight,
      toggleDislike,
    ],
  );

  const feedRefreshing = status === 'loading' && recipes.length > 0;

  const keyExtractor = useCallback((item: FeedListItem) => (item.kind === 'today' ? item.id : item.recipe.id), []);

  const onEndReached = useCallback(() => {
    loadMore();
  }, [loadMore]);

  const handleOpenSurpriseInFeed = useCallback(() => {
    if (feedItems.length === 0) {
      Alert.alert('Sin recetas', 'No hay recetas visibles para sorprenderte ahora.');
      return;
    }
    const idx = Math.floor(Math.random() * feedItems.length);
    const listIndex = topRecommendations.length > 0 ? idx + 1 : idx;
    listRef.current?.scrollToIndex({ index: listIndex, animated: true });
  }, [feedItems.length, topRecommendations.length]);

  useEffect(() => {
    if (!userId || feedItems.length === 0) {
      setMissedRecipeIds([]);
      return;
    }
    let cancelled = false;
    const loadMissed = async () => {
      const supabase = getSupabaseClient();
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();
      const { data, error } = await supabase
        .from('recipe_events')
        .select('recipe_id,event_type,created_at')
        .eq('user_id', userId)
        .in('event_type', ['viewed', 'cooked'])
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error || !data || cancelled) {
        return;
      }

      const cooked = new Set<string>();
      const viewedOrdered: string[] = [];
      const seenViewed = new Set<string>();
      for (const row of data) {
        if (!row.recipe_id) continue;
        if (row.event_type === 'cooked') {
          cooked.add(row.recipe_id);
          continue;
        }
        if (row.event_type === 'viewed' && !seenViewed.has(row.recipe_id)) {
          seenViewed.add(row.recipe_id);
          viewedOrdered.push(row.recipe_id);
        }
      }

      const visibleSet = new Set(feedItems.map((item) => item.recipe.id));
      const missed = viewedOrdered.filter((id) => !cooked.has(id) && visibleSet.has(id)).slice(0, 10);
      setMissedRecipeIds(missed);
    };
    void loadMissed();
    return () => {
      cancelled = true;
    };
  }, [feedItems, userId]);

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Inicia sesión para ver recetas.</Text>
      </View>
    );
  }

  if (status === 'loading' && recipes.length === 0) {
    return (
      <View style={styles.centered} accessibilityLabel="Cargando recetas">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (status === 'error' && recipes.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error} accessibilityRole="alert">
          {errorMessage ?? 'Error al cargar.'}
        </Text>
        <Pressable onPress={refresh} style={styles.retry} accessibilityRole="button">
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <RecipeFilterModal
        visible={filterOpen}
        initial={discovery.filters}
        onClose={() => setFilterOpen(false)}
        onApply={discovery.setFilters}
        shoppingListForFeed={useShoppingListForFeedFilter}
        onApplyShoppingListForFeed={setUseShoppingListForFeedFilter}
        shoppingPendingCount={uncheckedLabels.length}
        listSchemaMissing={listSchemaMissing}
      />

      <FeedAppBar
        onOpenFilters={() => setFilterOpen(true)}
        onOpenSurprise={() => {
          handleOpenSurpriseInFeed();
        }}
      />
      <FeedToolbar onSearch={() => navigation.navigate('RecipeSearch')} />

      {status === 'error' && errorMessage ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText} accessibilityRole="alert">
            {errorMessage}
          </Text>
          <Pressable onPress={refresh} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.bannerAction}>Actualizar</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.listViewport} onLayout={onFeedLayout}>
        <FlatList
          ref={listRef}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={listItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            const offset = averageItemLength * index;
            listRef.current?.scrollToOffset({ offset, animated: true });
          }}
          extraData={`${shoppingSignature}|${listSchemaMissing ? '1' : '0'}|${favoriteSignature}|${dislikedSignature}|${topRecommendations.length > 0 ? 'today' : 'notoday'}`}
          refreshControl={
            <RefreshControl
              refreshing={feedRefreshing}
              onRefresh={refresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          pagingEnabled
          decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.98}
          snapToInterval={listViewportHeight}
          snapToAlignment="start"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          getItemLayout={(_, index) => ({
            length: listViewportHeight,
            offset: listViewportHeight * index,
            index,
          })}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={2}
        updateCellsBatchingPeriod={32}
        removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <View style={[styles.empty, { minHeight: listViewportHeight }]}>
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.muted}>
                {recipes.length === 0
                  ? 'No encontramos resultados con estos filtros. Prueba a relajar lista o tiempo.'
                  : `Ocultamos ${Math.max(0, recipes.length - visibleRecipes.length)} recetas por "No me gusta". Ajusta filtros o quita dislikes.`}
              </Text>
              <Pressable onPress={refresh} style={styles.retry} accessibilityRole="button">
                <Text style={styles.retryText}>Actualizar</Text>
              </Pressable>
            </View>
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listViewport: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 112,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  retryText: {
    ...typography.subtitle,
    color: colors.accentForeground,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bannerText: {
    ...typography.body,
    color: colors.danger,
    flex: 1,
  },
  bannerAction: {
    ...typography.subtitle,
    color: colors.accent,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.title,
    fontSize: 22,
    color: colors.textPrimary,
  },
});
