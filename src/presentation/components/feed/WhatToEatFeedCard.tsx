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

const DIFFICULTY_LABEL: Record<Recipe['difficulty'], string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
};

type Props = {
  height: number;
  featuredRecipe: Recipe;
  onOpenOptions: () => void;
  onOpenFeatured: () => void;
};

function WhatToEatFeedCardInner({ height, featuredRecipe, onOpenOptions, onOpenFeatured }: Props) {
  const heroHeight = Math.round(height * 0.52);
  const dietShort = dietBadgeLabel(featuredRecipe.dietType).toUpperCase();

  const onFeaturedPress = useCallback(() => {
    onOpenFeatured();
  }, [onOpenFeatured]);

  const onOptionsPress = useCallback(() => {
    onOpenOptions();
  }, [onOpenOptions]);

  return (
    <View style={[styles.root, { height }]} accessibilityRole="none">
      <View style={[styles.card, elevation.card]}>
        <LinearGradient
          colors={['#c8e6c9', '#fff8f5', '#ffdbc9']}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={[styles.hero, { height: heroHeight }]}>
            <View style={styles.heroTopRow}>
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={14} color={colors.onSecondaryContainer} />
                <Text style={styles.badgeText}>PARA TI</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>¿Qué como hoy?</Text>
            <Text style={styles.heroSubtitle}>Ideas según tu actividad y filtros.</Text>
            <View style={styles.heroIconWrap}>
              <Ionicons name="nutrition" size={52} color={colors.secondary} style={styles.heroIcon} />
            </View>
          </View>

          <View style={styles.sheet}>
            <Text style={styles.sheetLabel}>Sugerencia principal</Text>
            <Pressable
              onPress={onFeaturedPress}
              style={({ pressed }) => [styles.featureRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${featuredRecipe.title}`}
            >
              <Image
                source={{ uri: featuredRecipe.imageUrl }}
                style={styles.thumb}
                contentFit="cover"
              />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle} numberOfLines={2}>
                  {featuredRecipe.title}
                </Text>
                <View style={styles.featureMeta}>
                  <Text style={styles.featureMetaText}>
                    {featuredRecipe.cookTimeMinutes} min · {DIFFICULTY_LABEL[featuredRecipe.difficulty]}
                  </Text>
                  <View style={styles.dietPill}>
                    <Text style={styles.dietPillText} numberOfLines={1}>
                      {dietShort}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            </Pressable>

            <Pressable
              onPress={onOptionsPress}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed, elevation.primaryButton]}
              accessibilityRole="button"
              accessibilityLabel="Ver más opciones para hoy"
            >
              <Text style={styles.ctaText}>Ver opciones de hoy</Text>
              <Ionicons name="arrow-forward-circle" size={22} color={colors.onSecondary} />
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

export const WhatToEatFeedCard = memo(WhatToEatFeedCardInner);

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
    borderRadius: radius.xxl,
    borderWidth: 2,
    borderColor: 'rgba(55, 104, 71, 0.55)',
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  cardGradient: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  badgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.onSecondaryContainer,
  },
  heroTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  heroIconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    opacity: 0.88,
  },
  sheet: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  sheetLabel: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  featureText: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  featureMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featureMetaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  dietPill: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  dietPillText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 10,
    color: colors.onSecondaryContainer,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  ctaText: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    color: colors.onSecondary,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
