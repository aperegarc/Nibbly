import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Recipe } from '../../../domain/entities/Recipe';
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

  return (
    <View style={[styles.root, { height }]} accessibilityRole="none">
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
            <LinearGradient
              pointerEvents="none"
              colors={[colors.scrimTop, 'transparent']}
              style={styles.imageTopFade}
            />
            <View style={styles.imageActions}>
              {onAddMissingIngredientsToList ? (
                <Pressable
                  onPress={onCartPress}
                  disabled={shoppingListDisabled}
                  style={({ pressed }) => [
                    styles.iconButton,
                    elevation.floating,
                    pressed && !shoppingListDisabled && styles.favoritePressed,
                    shoppingListDisabled && styles.iconButtonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Añadir ingredientes faltantes a la lista"
                  hitSlop={8}
                >
                  <Ionicons name="cart-outline" size={22} color={colors.accent} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={onFavoritePress}
                style={({ pressed }) => [
                  styles.iconButton,
                  elevation.floating,
                  pressed && styles.favoritePressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                hitSlop={8}
              >
                <Text style={[styles.favoriteIcon, isFavorite && styles.favoriteIconActive]}>
                  {isFavorite ? '♥' : '♡'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sheetHead}>
            <View style={styles.sheetHandle} />
            <Text style={styles.kicker}>Receta</Text>
            <Text style={styles.title}>{recipe.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{recipe.cookTimeMinutes} min</Text>
              </View>
              <View style={styles.pillMuted}>
                <Text style={styles.pillMutedText}>{DIFFICULTY_LABEL[recipe.difficulty]}</Text>
              </View>
            </View>
          </View>
        </View>
      </GestureDetector>

      <View style={[styles.sheetScrollHost, elevation.card]}>
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

          {onOpenDetail ? (
            <Pressable
              onPress={onDetailPress}
              style={styles.detailCta}
              accessibilityRole="button"
              accessibilityLabel="Ver receta completa (botón)"
            >
              <Text style={styles.detailCtaText}>Ver receta completa</Text>
            </Pressable>
          ) : null}

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
  );
}

export const RecipeFeedCard = memo(RecipeFeedCardInner);

const styles = StyleSheet.create({
  root: {
    width: '100%',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  imageShell: {
    width: '100%',
    borderRadius: radius.xl,
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
  imageTopFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 72,
  },
  imageActions: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.45,
  },
  favoritePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  favoriteIcon: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  favoriteIconActive: {
    color: colors.favorite,
  },
  sheetHead: {
    marginTop: -spacing.xl,
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sheetScrollHost: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  kicker: {
    ...typography.caption,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  pill: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  pillText: {
    ...typography.caption,
    fontFamily: fontFamilies.bold,
    color: colors.accent,
  },
  pillMuted: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  pillMutedText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionHeading: {
    ...typography.subtitle,
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
    marginTop: 8,
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
  detailCta: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  detailCtaText: {
    ...typography.subtitle,
    color: colors.accentForeground,
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
