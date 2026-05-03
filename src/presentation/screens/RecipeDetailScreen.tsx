import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLayoutEffect, useMemo } from 'react';
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
import { useRecipeDetail } from '../hooks/useRecipeDetail';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.xl) },
      ]}
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
          colors={['transparent', colors.scrimBottom]}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <View style={styles.sheet}>
        <Text style={styles.kicker}>Receta completa</Text>
        <Text style={styles.title}>{recipe.title}</Text>

        <View style={styles.metaRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{recipe.cookTimeMinutes} min</Text>
          </View>
          <View style={styles.pillMuted}>
            <Text style={styles.pillMutedText}>{DIFFICULTY_LABEL[recipe.difficulty]}</Text>
          </View>
        </View>

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

        {canCookMode ? (
          <Pressable
            onPress={() =>
              navigateToCookingMode(navigation as NativeStackNavigationProp<FeedStackParamList>, recipe.id)
            }
            style={styles.cookModeCta}
            accessibilityRole="button"
            accessibilityLabel="Abrir modo cocinar paso a paso con temporizador"
          >
            <Text style={styles.cookModeCtaText}>Modo cocinar</Text>
            <Text style={styles.cookModeCtaHint}>Paso a paso, checklist y temporizador</Text>
          </Pressable>
        ) : null}

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
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
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
    height: 240,
    backgroundColor: colors.surfaceMuted,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  sheet: {
    marginTop: -spacing.xl,
    marginHorizontal: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
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
    fontSize: 26,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
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
  cookModeCta: {
    marginTop: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.accentWarm,
    gap: spacing.xs,
  },
  cookModeCtaText: {
    ...typography.subtitle,
    color: colors.accentWarmForeground,
    fontSize: 17,
  },
  cookModeCtaHint: {
    ...typography.caption,
    color: colors.accentWarmForeground,
    opacity: 0.92,
  },
  sectionHeading: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
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
