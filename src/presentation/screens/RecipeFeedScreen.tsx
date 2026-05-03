import { useHeaderHeight } from '@react-navigation/elements';
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
import { RecipeFeedCard } from '../components/feed/RecipeFeedCard';
import { Nibbly, nibblySemantics } from '../components/nibbly';
import { FeedToolbar } from '../components/FeedToolbar';
import { QuickDecideModal, type QuickDecideResult } from '../components/QuickDecideModal';
import { RecipeFilterModal } from '../components/RecipeFilterModal';
import { useFavorites } from '../hooks/useFavorites';
import { useRecipeFeed } from '../hooks/useRecipeFeed';
import type { FeedStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

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
  const headerHeight = useHeaderHeight();
  const estimatedToolbar = 120;
  const [listViewportHeight, setListViewportHeight] = useState(() =>
    Math.max(280, windowHeight - headerHeight - estimatedToolbar),
  );

  const [filterOpen, setFilterOpen] = useState(false);
  const [quickDecideOpen, setQuickDecideOpen] = useState(false);
  const [surpriseRequestId, setSurpriseRequestId] = useState(0);
  const listRef = useRef<FlatList<Recipe>>(null);
  const pendingSurpriseScroll = useRef(false);

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

  const pantryIngredientNames = useMemo(() => discovery.ingredientTags, [discovery.ingredientTags]);

  const shoppingListIngredientNames = useMemo(
    () => (useShoppingListForFeedFilter ? uncheckedLabels : []),
    [uncheckedLabels, useShoppingListForFeedFilter],
  );

  const { recipes, status, errorMessage, refresh, loadMore } = useRecipeFeed({
    userId,
    preferences,
    filters: discovery.filters,
    pantryIngredientNames,
    matchPantryIngredients: discovery.matchPantryIngredients,
    shoppingListIngredientNames,
    shoppingListFilterActive: useShoppingListForFeedFilter,
  });

  const { isFavorite, toggleFavorite, favoriteIds } = useFavorites(userId);
  const favoriteSignature = useMemo(() => [...favoriteIds].sort().join('|'), [favoriteIds]);
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

  const renderItem = useCallback(
    ({ item }: { item: Recipe }) => (
      <RecipeFeedCard
        recipe={item}
        height={listViewportHeight}
        isFavorite={isFavorite(item.id)}
        onToggleFavorite={handleToggleFavorite}
        onOpenDetail={handleOpenDetail}
        onAddMissingIngredientsToList={addRecipeIngredientsToList}
        shoppingListDisabled={listSchemaMissing}
      />
    ),
    [
      addRecipeIngredientsToList,
      handleOpenDetail,
      handleToggleFavorite,
      isFavorite,
      listSchemaMissing,
      listViewportHeight,
    ],
  );

  const feedRefreshing = status === 'loading' && recipes.length > 0;

  const keyExtractor = useCallback((item: Recipe) => item.id, []);

  const onEndReached = useCallback(() => {
    loadMore();
  }, [loadMore]);

  const handleQuickDecideComplete = useCallback(
    (opts: QuickDecideResult, surprise: boolean) => {
      discovery.setMatchPantryIngredients(opts.pantryOnly);
      discovery.setFilters({ ...discovery.filters, maxCookTimeMinutes: opts.maxCookTimeMinutes });
      if (opts.useShoppingListForFeed) {
        if (uncheckedLabels.length === 0) {
          Alert.alert('Lista vacía', 'Añade pendientes en la pestaña Lista para filtrar por lista.');
          setUseShoppingListForFeedFilter(false);
        } else {
          setUseShoppingListForFeedFilter(true);
        }
      } else {
        setUseShoppingListForFeedFilter(false);
      }
      if (surprise) {
        pendingSurpriseScroll.current = true;
        setSurpriseRequestId((n) => n + 1);
      }
    },
    [discovery, setUseShoppingListForFeedFilter, uncheckedLabels.length],
  );

  useEffect(() => {
    if (!pendingSurpriseScroll.current) {
      return;
    }
    if (status !== 'idle') {
      return;
    }
    if (recipes.length === 0) {
      pendingSurpriseScroll.current = false;
      return;
    }
    pendingSurpriseScroll.current = false;
    const idx = Math.floor(Math.random() * recipes.length);
    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: true });
    });
    return () => cancelAnimationFrame(id);
  }, [status, recipes, surpriseRequestId]);

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
      keyboardVerticalOffset={headerHeight}
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

      <QuickDecideModal
        visible={quickDecideOpen}
        onClose={() => setQuickDecideOpen(false)}
        pantryTagCount={discovery.ingredientTags.length}
        matchPantryIngredients={discovery.matchPantryIngredients}
        shoppingListFilterActive={useShoppingListForFeedFilter}
        shoppingPendingCount={uncheckedLabels.length}
        maxCookTimeMinutes={discovery.filters.maxCookTimeMinutes}
        onComplete={handleQuickDecideComplete}
      />

      <FeedToolbar
        ingredientTags={discovery.ingredientTags}
        onAddIngredient={discovery.addIngredientTag}
        onRemoveIngredient={discovery.removeIngredientTag}
        onOpenFilters={() => setFilterOpen(true)}
        onOpenSurprise={() => setQuickDecideOpen(true)}
      />

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
          data={recipes}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            const offset = averageItemLength * index;
            listRef.current?.scrollToOffset({ offset, animated: true });
          }}
          extraData={`${favoriteSignature}|${shoppingSignature}|${listSchemaMissing ? '1' : '0'}`}
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
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
          ListEmptyComponent={
            <View style={[styles.empty, { minHeight: listViewportHeight }]}>
              <Nibbly
                state={nibblySemantics.noResults}
                size={96}
                accessibilityLabel="Nibbly no encuentra recetas con estos filtros"
                style={{ marginBottom: spacing.md }}
              />
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.muted}>
                Nibbly no encuentra nada con estos filtros. Prueba a relajar nevera, lista o tiempo.
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
