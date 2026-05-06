import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  isDisliked: boolean;
  onToggleFavorite: (recipeId: string) => void;
  onToggleDislike: (recipeId: string) => void;
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
  isDisliked,
  onToggleFavorite,
  onToggleDislike,
  onOpenDetail,
  onAddMissingIngredientsToList,
  shoppingListDisabled,
}: Props) {
  const imageHeight = Math.round(height * 0.66);

  const onFavoritePress = useCallback(() => {
    onToggleFavorite(recipe.id);
  }, [onToggleFavorite, recipe.id]);

  const onDislikePress = useCallback(() => {
    onToggleDislike(recipe.id);
  }, [onToggleDislike, recipe.id]);

  const onCartPress = useCallback(() => {
    onAddMissingIngredientsToList?.(recipe);
  }, [onAddMissingIngredientsToList, recipe]);

  const onDetailPress = useCallback(() => {
    onOpenDetail?.(recipe.id);
  }, [onOpenDetail, recipe.id]);

  const dietShort = dietBadgeLabel(recipe.dietType).toUpperCase();

  return (
    <View style={[styles.root, { height }]} accessibilityRole="none">
      <View style={[styles.card, elevation.card]}>
        <View>
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
                <Pressable
                  onPress={onDislikePress}
                  style={({ pressed }) => [
                    styles.iconButton,
                    elevation.floating,
                    pressed && styles.pressed,
                    isDisliked && styles.iconButtonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={isDisliked ? 'Quitar no me gusta' : 'No me gusta'}
                  hitSlop={8}
                >
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color={isDisliked ? colors.danger : colors.textMuted}
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
            <Text style={styles.title} numberOfLines={2}>
              {recipe.title}
            </Text>
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
                  pressed && !shoppingListDisabled && styles.pressed,
                  shoppingListDisabled && styles.iconButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Añadir faltantes a la lista"
              >
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export const RecipeFeedCard = memo(RecipeFeedCardInner);

const styles = StyleSheet.create({
  root: {
    height: '100%',
    width: '100%',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    gap: 10,

  },
  card: {
    height: '95%',
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
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    letterSpacing: -0.35,
    lineHeight: 24,
    color: colors.textPrimary,
    minHeight: 48,
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
});
