import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile } from '../../app/providers/ProfileProvider';
import { SignOutHeaderButton } from '../components/SignOutHeaderButton';
import { TagChipsEditor } from '../components/TagChipsEditor';
import { DIET_OPTIONS } from '../constants/dietOptions';
import type { AppStackParamList } from '../navigation/types';
import type { DietType } from '../../domain/entities/Recipe';
import { LIMITS } from '../../shared/utils/limits';
import { sanitizeUserTag } from '../../shared/utils/sanitize';
import { colors } from '../theme/colors';
import { elevation } from '../theme/shadows';
import { fontFamilies } from '../theme/fonts';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<AppStackParamList, 'Onboarding'>;

const DIET_ICONS: Record<DietType, keyof typeof Ionicons.glyphMap> = {
  balanced: 'nutrition-outline',
  vegan: 'leaf-outline',
  vegetarian: 'flower-outline',
  keto: 'flash-outline',
  paleo: 'barbell-outline',
  gluten_free: 'pizza-outline',
};

export function OnboardingScreen({ navigation }: Props) {
  const { completeOnboarding } = useProfile();
  const [diet, setDiet] = useState<DietType>('balanced');
  const [allergyTags, setAllergyTags] = useState<string[]>([]);
  const [preferenceTags, setPreferenceTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addAllergy = (value: string) => {
    const next = sanitizeUserTag(value, LIMITS.profileTagMaxLength);
    if (!next) {
      return;
    }
    setAllergyTags((prev) => {
      if (prev.length >= LIMITS.profileTagMaxCount) {
        return prev;
      }
      const lower = next.toLowerCase();
      if (prev.some((item) => item.toLowerCase() === lower)) {
        return prev;
      }
      return [...prev, next];
    });
  };

  const addPreference = (value: string) => {
    const next = sanitizeUserTag(value, LIMITS.profileTagMaxLength);
    if (!next) {
      return;
    }
    setPreferenceTags((prev) => {
      if (prev.length >= LIMITS.profileTagMaxCount) {
        return prev;
      }
      const lower = next.toLowerCase();
      if (prev.some((item) => item.toLowerCase() === lower)) {
        return prev;
      }
      return [...prev, next];
    });
  };

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await completeOnboarding({
        diet,
        allergies: allergyTags,
        preferences: preferenceTags,
      });
      navigation.replace('Main');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Intenta de nuevo en unos segundos.';
      Alert.alert('No se pudo guardar', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <View style={styles.topBrand}>
          <Text style={styles.topBrandText}>Nibbly</Text>
        </View>
        <SignOutHeaderButton variant="icon" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Personaliza tu experiencia</Text>
            <Text style={styles.heroLead}>
              Esto nos ayuda a sugerirte recetas que te encantarán y evitar alergias. ¡Queremos que cada bocado sea
              perfecto para ti!
            </Text>
          </View>
          <View style={styles.heroAccentWrap}>
            <View style={styles.heroGlow} />
            <Ionicons name="sparkles-outline" size={72} color={colors.accent} accessibilityLabel="Bienvenida" />
          </View>
        </View>

        <View style={[styles.bento, elevation.cardSoft]}>
          <View style={styles.bentoHead}>
            <Ionicons name="restaurant" size={22} color={colors.accent} />
            <Text style={styles.bentoTitle}>Tu dieta principal</Text>
          </View>
          <View style={styles.dietGrid}>
            {DIET_OPTIONS.map((option) => {
              const selected = diet === option.value;
              const iconName = DIET_ICONS[option.value];
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setDiet(option.value)}
                  style={[styles.dietTile, selected && styles.dietTileSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <View style={[styles.dietIconCircle, selected && styles.dietIconCircleSelected]}>
                    <Ionicons name={iconName} size={22} color={selected ? colors.accentForeground : colors.accent} />
                  </View>
                  <Text style={styles.dietTileLabel}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.allergyBlock}>
          <View style={styles.bentoHead}>
            <Ionicons name="warning" size={22} color={colors.danger} />
            <Text style={styles.bentoTitle}>Alergias o intolerancias</Text>
          </View>
          <TagChipsEditor
            label=""
            tags={allergyTags}
            onAdd={addAllergy}
            onRemove={(tag) => setAllergyTags((prev) => prev.filter((item) => item !== tag))}
            placeholder="Ej. cacahuete, lactosa…"
            maxTags={LIMITS.profileTagMaxCount}
            maxLength={LIMITS.profileTagMaxLength}
            hint="Las recetas que contengan estos términos en ingredientes o título se ocultarán."
          />
        </View>

        <View style={styles.prefBlock}>
          <View style={styles.bentoHead}>
            <Ionicons name="heart" size={22} color={colors.secondary} />
            <Text style={styles.bentoTitle}>Preferencias gastronómicas</Text>
          </View>
          <TagChipsEditor
            label=""
            tags={preferenceTags}
            onAdd={addPreference}
            onRemove={(tag) => setPreferenceTags((prev) => prev.filter((item) => item !== tag))}
            placeholder="Ej. picante, batch cooking…"
            maxTags={LIMITS.profileTagMaxCount}
            maxLength={LIMITS.profileTagMaxLength}
            hint="Las usaremos para afinar recomendaciones."
          />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomCta}>
        <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.primary,
              elevation.primaryButton,
              pressed && styles.primaryPressed,
              submitting && styles.primaryDisabled,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>{submitting ? 'Guardando…' : 'Guardar y continuar'}</Text>
            <Ionicons name="arrow-forward" size={22} color={colors.accentForeground} />
          </Pressable>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.toolbar,
  },
  topBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  topBrandText: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    color: colors.accent,
    letterSpacing: -0.4,
  },
  scrollBody: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  heroRow: {
    gap: spacing.lg,
  },
  heroCopy: {
    gap: spacing.md,
  },
  heroTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 30,
    letterSpacing: -0.6,
    lineHeight: 36,
    color: colors.textPrimary,
  },
  heroLead: {
    ...typography.body,
    fontSize: 17,
    color: colors.textSecondary,
    maxWidth: 520,
  },
  heroAccentWrap: {
    alignSelf: 'center',
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryContainer,
    opacity: 0.12,
    borderRadius: 999,
    transform: [{ scale: 1.05 }],
  },
  bento: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 179, 0.45)',
    gap: spacing.lg,
  },
  bentoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bentoTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 19,
    color: colors.textPrimary,
  },
  dietGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  dietTile: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
  },
  dietTileSelected: {
    borderColor: colors.primaryContainer,
    backgroundColor: colors.surface,
    ...elevation.cardSoft,
  },
  dietIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietIconCircleSelected: {
    backgroundColor: colors.primaryContainer,
  },
  dietTileLabel: {
    ...typography.label,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  allergyBlock: {
    backgroundColor: 'rgba(255, 218, 214, 0.35)',
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.12)',
    gap: spacing.md,
  },
  prefBlock: {
    backgroundColor: 'rgba(182, 237, 194, 0.2)',
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(55, 104, 71, 0.15)',
    gap: spacing.md,
  },
  bottomCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 248, 245, 0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  bottomSafe: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  primaryPressed: {
    opacity: 0.92,
  },
  primaryDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    color: colors.accentForeground,
  },
});
