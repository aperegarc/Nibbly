import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Recipe } from '../../../domain/entities/Recipe';
import { dietBadgeLabel } from '../../constants/dietOptions';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';
import { elevation } from '../../theme/shadows';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = {
  recipe: Recipe;
  height: number;
  isFavorite: boolean;
  onToggleFavorite: (recipeId: string) => void;
  onOpenDetail?: (recipeId: string) => void;
  onAddMissingIngredientsToList?: (recipe: Recipe) => void;
  shoppingListDisabled?: boolean;
};

const DIFFICULTY_LABEL: Record<Recipe['difficulty'], string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
};

function RecipeFeedCardInner({
  recipe,
  height,
  isFavorite,
  onToggleFavorite,
  onOpenDetail,
  onAddMissingIngredientsToList,
  shoppingListDisabled,
}: Props) {
  const insets = useSafeAreaInsets();
  const imageHeight = Math.round(height * 0.58);

  const onOpenAttribution = useCallback(() => {
    if (recipe.dataSourceUrl) {
      void Linking.openURL(recipe.dataSourceUrl);
    }
  }, [recipe.dataSourceUrl]);

  const onFavoritePress = useCallback(() => {
    onToggleFavorite(recipe.id);
  }, [onToggleFavorite, recipe.id]);

  const onCartPress = useCallback(() => {
    onAddMissingIngredientsToList?.(recipe);
  }, [onAddMissingIngredientsToList, recipe]);

  const onDetailPress = useCallback(() => {
    onOpenDetail?.(recipe.id);
  }, [onOpenDetail, recipe.id]);

  const openDetailTap = useMemo(() => {
    return Gesture.Tap()
      .maxDistance(14)
      .onEnd((_event, success) => {
        if (success) {
          onOpenDetail?.(recipe.id);
        }
      });
  }, [onOpenDetail, recipe.id]);

  const dietShort = dietBadgeLabel(recipe.dietType).toUpperCase();

  return (
    <View style={[styles.root, { height }]} accessibilityRole="none">
      <View style={[styles.card, elevation.card]}>
        <GestureDetector gesture={openDetailTap}>
          <View
            collapsable={false}
            accessible={Boolean(onOpenDetail)}
            accessibilityRole={onOpenDetail ? 'button' : 'none'}
            accessibilityLabel={onOpenDetail ? `Ver receta completa: ${recipe.title}` : undefined}
            accessibilityHint={
              onOpenDetail ? 'No se activa al deslizar entre recetas; usa un toque breve' : undefined
            }
          >
            <View style={[styles.imageShell, { height: imageHeight }]}>
              <Image
                source={{ uri: recipe.imageUrl }}
                style={styles.image}
                contentFit="cover"
                transition={220}
                accessibilityLabel={`Foto de ${recipe.title}`}
              />
              <LinearGradient
                pointerEvents="none"
                colors={['transparent', colors.scrimBottom]}
                style={styles.imageGradient}
              />
              <View style={styles.imagePills}>
                <View style={styles.pillDiet}>
                  <Text style={styles.pillDietText} numberOfLines={1}>
                    {dietShort}
                  </Text>
                </View>
                <View style={styles.pillTime}>
                  <Text style={styles.pillTimeText}>{recipe.cookTimeMinutes} min</Text>
                </View>
              </View>
              <View style={styles.imageActions}>
                <Pressable
                  onPress={onFavoritePress}
                  style={({ pressed }) => [
                    styles.iconButton,
                    elevation.floating,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                  hitSlop={8}
                >
                  <Ionicons
                    name={isFavorite ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isFavorite ? colors.favorite : colors.accent}
                  />
                </Pressable>
                {onAddMissingIngredientsToList ? (
                  <Pressable
                    onPress={onCartPress}
                    disabled={shoppingListDisabled}
                    style={({ pressed }) => [
                      styles.iconButton,
                      elevation.floating,
                      pressed && !shoppingListDisabled && styles.pressed,
                      shoppingListDisabled && styles.iconButtonDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Añadir ingredientes faltantes a la lista"
                    hitSlop={8}
                  >
                    <Ionicons name="cart-outline" size={22} color={colors.secondary} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.sheetHead}>
              <Text style={styles.title}>{recipe.title}</Text>
              <View style={styles.metaIcons}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                  <Text style={styles.metaText}>{recipe.cookTimeMinutes} min</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="restaurant-outline" size={18} color={colors.textMuted} />
                  <Text style={styles.metaText}>{DIFFICULTY_LABEL[recipe.difficulty]}</Text>
                </View>
              </View>

              {onOpenDetail ? (
                <Pressable
                  onPress={onDetailPress}
                  style={({ pressed }) => [styles.ctaPrimary, pressed && styles.pressed, elevation.primaryButton]}
                  accessibilityRole="button"
                  accessibilityLabel="Ver receta completa"
                >
                  <Text style={styles.ctaPrimaryText}>Ver receta completa</Text>
                </Pressable>
              ) : null}

              {onAddMissingIngredientsToList ? (
                <Pressable
                  onPress={onCartPress}
                  disabled={shoppingListDisabled}
                  style={({ pressed }) => [
                    styles.ctaSecondary,
                    pressed && !shoppingListDisabled && styles.pressed,
                    shoppingListDisabled && styles.iconButtonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Añadir faltantes a la lista"
                >
                  <Ionicons name="cart-outline" size={20} color={colors.secondary} />
                  <Text style={styles.ctaSecondaryText}>Añadir faltantes a la lista</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </GestureDetector>

        <View style={styles.sheetScrollHost}>
          <ScrollView
            style={styles.body}
            contentContainerStyle={[
              styles.bodyContent,
              { paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.lg) },
            ]}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <Text style={styles.sectionHeading}>Ingredientes</Text>
            {recipe.ingredients.length === 0 ? (
              <Text style={styles.muted}>Sin ingredientes listados.</Text>
            ) : (
              recipe.ingredients.map((name, index) => (
                <View key={`${recipe.id}-ing-${index}`} style={styles.ingredientRow}>
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientText}>{name}</Text>
                </View>
              ))
            )}

            <Text style={styles.sectionHeading}>Pasos rápidos</Text>
            {recipe.quickSteps.length === 0 ? (
              <Text style={styles.muted}>Sin pasos listados.</Text>
            ) : (
              recipe.quickSteps.map((step, index) => (
                <View key={`${recipe.id}-step-${index}`} style={styles.stepRow}>
                  <Text style={styles.stepIndex}>{String(index + 1).padStart(2, '0')}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))
            )}

            {recipe.dataSourceName ? (
              <Pressable
                onPress={recipe.dataSourceUrl ? onOpenAttribution : undefined}
                disabled={!recipe.dataSourceUrl}
                style={styles.attribution}
                accessibilityRole={recipe.dataSourceUrl ? 'link' : 'text'}
                accessibilityLabel={`Fuente de datos: ${recipe.dataSourceName}`}
              >
                <Text style={styles.attributionText}>
                  Fuente: {recipe.dataSourceName}
                  {recipe.dataSourceUrl ? ' · tocar para más' : ''}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

export const RecipeFeedCard = memo(RecipeFeedCardInner);

const styles = StyleSheet.create({
  root: {
    width: '100%',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 66, 0.15)',
    overflow: 'hidden',
  },
  imageShell: {
    width: '100%',
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePills: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pillDiet: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  pillDietText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.onSecondaryContainer,
  },
  pillTime: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  pillTimeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    letterSpacing: 0.3,
    color: colors.onPrimaryContainer,
  },
  imageActions: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: radius.full,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  sheetHead: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    letterSpacing: -0.35,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  metaIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...typography.label,
    color: colors.textMuted,
  },
  ctaPrimary: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimaryText: {
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    color: colors.accentForeground,
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: 'rgba(55, 104, 71, 0.25)',
    backgroundColor: 'rgba(55, 104, 71, 0.06)',
  },
  ctaSecondaryText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    color: colors.secondary,
  },
  sheetScrollHost: {
    flex: 1,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  sectionHeading: {
    ...typography.subtitle,
    fontFamily: fontFamilies.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 10,
    backgroundColor: colors.accent,
    opacity: 0.85,
  },
  ingredientText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  stepIndex: {
    ...typography.caption,
    fontFamily: fontFamilies.bold,
    color: colors.textMuted,
    width: 28,
    marginTop: 2,
  },
  stepText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  attribution: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  attributionText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
