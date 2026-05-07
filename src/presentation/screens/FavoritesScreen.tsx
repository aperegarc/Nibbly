import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../../app/providers/AuthProvider';
import { useDiscoveryPreferences } from '../../app/providers/DiscoveryPreferencesProvider';
import { useProfile } from '../../app/providers/ProfileProvider';
import { useShoppingList } from '../../app/providers/ShoppingListProvider';
import { SupabaseRecipeRepository } from '../../infrastructure/repositories/SupabaseRecipeRepository';
import {
  recipeIngredientsCoveredByShoppingLabels,
  recipeMatchesFilters,
} from '../../shared/utils/recipeFilterMatch';
import { getRecipeTimeBucketLabel } from '../../shared/utils/recipeTime';
import { RecipeFilterModal } from '../components/RecipeFilterModal';
import { SignOutHeaderButton } from '../components/SignOutHeaderButton';
import { useFavoriteRecipes } from '../hooks/useFavoriteRecipes';
import type { FavoritesStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<FavoritesStackParamList, 'FavoritesHome'>;

export function FavoritesScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { profile } = useProfile();
  const discovery = useDiscoveryPreferences();
  const {
    uncheckedLabels,
    useShoppingListForFeedFilter,
    setUseShoppingListForFeedFilter,
    listSchemaMissing,
  } = useShoppingList();
  const userId = session?.user.id;
  const [filterOpen, setFilterOpen] = useState(false);
  const repository = useMemo(() => new SupabaseRecipeRepository(), []);

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

  const { recipes, loading, error, refresh } = useFavoriteRecipes(userId, preferences);

  const handleRemoveFavorite = useCallback(
    (recipeId: string, title: string) => {
      if (!userId) {
        return;
      }
      Alert.alert('Quitar de favoritos', `¿Eliminar "${title}" de tus favoritos?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await repository.removeFavorite(userId, recipeId);
                await refresh();
              } catch {
                Alert.alert('Error', 'No se pudo quitar la receta de favoritos.');
              }
            })();
          },
        },
      ]);
    },
    [refresh, repository, userId],
  );

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      if (!recipeMatchesFilters(r, discovery.filters)) {
        return false;
      }
      if (useShoppingListForFeedFilter) {
        if (uncheckedLabels.length === 0) {
          return false;
        }
        return recipeIngredientsCoveredByShoppingLabels(r, uncheckedLabels);
      }
      return true;
    });
  }, [discovery.filters, recipes, uncheckedLabels, useShoppingListForFeedFilter]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Favoritos',
      headerRight: () => (
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => navigation.navigate('CreateRecipe')}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Crear receta"
            hitSlop={8}
          >
            <Text style={styles.headerBtnText}>Crear</Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterOpen(true)}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Filtros y lista"
            hitSlop={8}
          >
            <Text style={styles.headerBtnText}>Filtros</Text>
          </Pressable>
          <SignOutHeaderButton />
        </View>
      ),
    });
  }, [navigation]);

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Inicia sesión para ver favoritos.</Text>
      </View>
    );
  }

  if (loading && recipes.length === 0) {
    return (
      <View style={styles.centered} accessibilityLabel="Cargando favoritos">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
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

      {error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText} accessibilityRole="alert">
            {error}
          </Text>
          <Pressable onPress={() => void refresh()} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.bannerAction}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        refreshing={loading}
        onRefresh={() => void refresh()}
        ListEmptyComponent={
          <View style={styles.empty}>
            {recipes.length === 0 ? (
              <>
                <Text style={styles.emptyTitle}>Sin favoritos aún</Text>
                <Text style={styles.muted}>Guarda recetas desde Explorar con el corazón.</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>Nada que coincida</Text>
                <Text style={styles.muted}>
                  {useShoppingListForFeedFilter && uncheckedLabels.length === 0
                    ? 'Activa la lista con ítems pendientes o quita el filtro en Filtros.'
                    : 'Prueba a relajar filtros o el modo lista en Filtros.'}
                </Text>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Abrir receta ${item.title}`}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.rowMeta}>{getRecipeTimeBucketLabel(item.cookTimeMinutes)}</Text>
              <Pressable
                onPress={() => handleRemoveFavorite(item.id, item.title)}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${item.title} de favoritos`}
                hitSlop={8}
              >
                <Text style={styles.removeText}>Eliminar de favoritos</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  headerBtnText: {
    ...typography.subtitle,
    color: colors.accent,
    fontSize: 16,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
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
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.title,
    fontSize: 20,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
  },
  rowPressed: {
    opacity: 0.92,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  rowText: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  removeText: {
    ...typography.caption,
    color: colors.danger,
  },
});
