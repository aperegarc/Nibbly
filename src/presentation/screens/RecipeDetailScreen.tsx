import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../app/providers/AuthProvider';
import { useProfile } from '../../app/providers/ProfileProvider';
import { getCookingSteps } from '../../shared/utils/recipeCookingSteps';
import type {
  FavoritesStackParamList,
  FeedStackParamList,
  WeeklyStackParamList,
} from '../navigation/types';
import { dietBadgeLabel } from '../constants/dietOptions';
import { useRecipeDetail } from '../hooks/useRecipeDetail';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { elevation } from '../theme/shadows';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props =
  | NativeStackScreenProps<FeedStackParamList, 'RecipeDetail'>
  | NativeStackScreenProps<FavoritesStackParamList, 'RecipeDetail'>
  | NativeStackScreenProps<WeeklyStackParamList, 'RecipeDetail'>;

function navigateToCookingMode(
  navigation: NativeStackNavigationProp<FeedStackParamList>,
  recipeId: string,
) {
  navigation.navigate('CookingMode', { recipeId });
}

const DIFFICULTY_LABEL = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
} as const;

export function RecipeDetailScreen({ navigation, route }: Props) {
  const { recipeId } = route.params;
  const insets = useSafeAreaInsets();
  const [ingredientChecked, setIngredientChecked] = useState<Record<number, boolean>>({});
  const { session } = useAuth();
  const { profile } = useProfile();

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

  const { recipe, loading, error } = useRecipeDetail(recipeId, preferences);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: recipe?.title ?? 'Receta',
    });
  }, [navigation, recipe?.title]);

  if (!session?.user.id) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Inicia sesión para ver esta receta.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered} accessibilityLabel="Cargando receta">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.retry}
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>No encontramos esta receta o no coincide con tus alergias.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.retry} accessibilityRole="button">
          <Text style={styles.retryText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const onOpenAttribution = () => {
    if (recipe.dataSourceUrl) {
      void Linking.openURL(recipe.dataSourceUrl);
    }
  };

  const canCookMode = getCookingSteps(recipe).length > 0;

  const toggleIngredient = (index: number) => {
    setIngredientChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const scrollBottomPad = Math.max(
    spacing.xxl,
    insets.bottom + spacing.xl + (canCookMode ? 88 : 0),
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image
            source={{ uri: recipe.imageUrl }}
            style={styles.heroImage}
            contentFit="cover"
            transition={220}
            accessibilityLabel={`Foto de ${recipe.title}`}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(30,27,24,0.12)', 'transparent', colors.background]}
            style={StyleSheet.absoluteFillObject}
          />
        </View>

        <View style={[styles.sheet, elevation.cardSoft]}>
          <View style={styles.badgeRow}>
            <View style={styles.badgeDiet}>
              <Text style={styles.badgeDietText}>{dietBadgeLabel(recipe.dietType)}</Text>
            </View>
            <View style={styles.badgeHint}>
              <Text style={styles.badgeHintText}>Receta completa</Text>
            </View>
          </View>
          <Text style={styles.title}>{recipe.title}</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Ionicons name="time-outline" size={22} color={colors.accent} />
              <Text style={styles.metaCellText}>{recipe.cookTimeMinutes} min</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaCell}>
              <Ionicons name="flash-outline" size={22} color={colors.accent} />
              <Text style={styles.metaCellText}>{DIFFICULTY_LABEL[recipe.difficulty]}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaCell}>
              <Ionicons name="nutrition-outline" size={22} color={colors.accent} />
              <Text style={styles.metaCellText} numberOfLines={1}>
                {dietBadgeLabel(recipe.dietType)}
              </Text>
            </View>
          </View>

          <View style={styles.ingredientHeaderRow}>
            <Text style={styles.sectionHeading}>Ingredientes</Text>
            <Text style={styles.ingredientCount}>
              {recipe.ingredients.length} ítem{recipe.ingredients.length === 1 ? '' : 's'}
            </Text>
          </View>
          {recipe.ingredients.length === 0 ? (
            <Text style={styles.mutedLeft}>Sin ingredientes listados.</Text>
          ) : (
            recipe.ingredients.map((name, index) => {
              const checked = Boolean(ingredientChecked[index]);
              return (
                <Pressable
                  key={`${recipe.id}-ing-${index}`}
                  onPress={() => toggleIngredient(index)}
                  style={({ pressed }) => [styles.ingredientCard, pressed && styles.ingredientCardPressed]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                >
                  <View style={[styles.ingredientCheck, checked && styles.ingredientCheckOn]}>
                    {checked ? (
                      <Ionicons name="checkmark" size={16} color={colors.onSecondary} />
                    ) : null}
                  </View>
                  <Text style={[styles.ingredientCardText, checked && styles.ingredientCardTextDone]}>{name}</Text>
                </Pressable>
              );
            })
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

        <Text style={styles.sectionHeading}>Instrucciones</Text>
        {recipe.fullInstructions?.trim() ? (
          <Text style={styles.bodyText}>{recipe.fullInstructions.trim()}</Text>
        ) : (
          <Text style={styles.muted}>
            Aún no hay instrucciones completas en español para esta receta. Puedes reimportar con el script de
            TheMealDB (traducción activada).
          </Text>
        )}

        {recipe.dataSourceName ? (
          <Pressable
            onPress={recipe.dataSourceUrl ? onOpenAttribution : undefined}
            disabled={!recipe.dataSourceUrl}
            style={styles.attribution}
            accessibilityRole={recipe.dataSourceUrl ? 'link' : 'text'}
          >
            <Text style={styles.attributionText}>
              Fuente: {recipe.dataSourceName}
              {recipe.dataSourceUrl ? ' · tocar para más' : ''}
            </Text>
          </Pressable>
        ) : null}
      </View>
      </ScrollView>

      {canCookMode ? (
        <View style={[styles.cookDock, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable
            onPress={() =>
              navigateToCookingMode(navigation as NativeStackNavigationProp<FeedStackParamList>, recipe.id)
            }
            style={({ pressed }) => [styles.cookDockBtn, elevation.primaryButton, pressed && styles.pressedDock]}
            accessibilityRole="button"
            accessibilityLabel="Abrir modo cocinar paso a paso con temporizador"
          >
            <Ionicons name="flame-outline" size={22} color={colors.onPrimaryContainer} />
            <Text style={styles.cookDockBtnText}>Entrar en modo cocinar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  hero: {
    width: '100%',
    height: 280,
    backgroundColor: colors.surfaceMuted,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  sheet: {
    marginTop: -spacing.xxl,
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 179, 0.35)',
    gap: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeDiet: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  badgeDietText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    letterSpacing: 0.3,
    color: colors.onSecondaryContainer,
  },
  badgeHint: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  badgeHintText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    letterSpacing: 0.2,
    color: colors.onPrimaryContainer,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    letterSpacing: -0.5,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  metaGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  metaCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
  },
  metaDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSoft,
  },
  metaCellText: {
    ...typography.label,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  ingredientHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  ingredientCount: {
    ...typography.body,
    color: colors.textSecondary,
  },
  sectionHeading: {
    ...typography.subtitle,
    fontFamily: fontFamilies.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mutedLeft: {
    ...typography.body,
    color: colors.textSecondary,
  },
  bodyText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
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
  ingredientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: spacing.sm,
  },
  ingredientCardPressed: {
    opacity: 0.92,
  },
  ingredientCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  ingredientCheckOn: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  ingredientCardText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  ingredientCardTextDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
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
  cookDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(255, 248, 245, 0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  cookDockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    paddingVertical: spacing.lg,
    borderRadius: radius.full,
  },
  cookDockBtnText: {
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    color: colors.onPrimaryContainer,
  },
  pressedDock: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
