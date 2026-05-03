import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<AppStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  const { completeOnboarding } = useProfile();
  const [diet, setDiet] = useState<DietType>('balanced');
  const [allergyTags, setAllergyTags] = useState<string[]>([]);
  const [preferenceTags, setPreferenceTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <SignOutHeaderButton />,
    });
  }, [navigation]);

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
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.lead}>
          Cuéntanos cómo comes para personalizar sugerencias y filtrar alergias.
        </Text>

        <Text style={styles.section}>Dieta principal</Text>
        <View style={styles.dietGrid}>
          {DIET_OPTIONS.map((option) => {
            const selected = diet === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setDiet(option.value)}
                style={[styles.dietChip, selected && styles.dietChipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.dietLabel, selected && styles.dietLabelSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <TagChipsEditor
          label="Alergias o intolerancias"
          tags={allergyTags}
          onAdd={addAllergy}
          onRemove={(tag) => setAllergyTags((prev) => prev.filter((item) => item !== tag))}
          placeholder="Ej. cacahuete, lactosa…"
          maxTags={LIMITS.profileTagMaxCount}
          maxLength={LIMITS.profileTagMaxLength}
          hint="Las recetas que contengan estos términos en ingredientes o título se ocultarán."
        />

        <TagChipsEditor
          label="Preferencias"
          tags={preferenceTags}
          onAdd={addPreference}
          onRemove={(tag) => setPreferenceTags((prev) => prev.filter((item) => item !== tag))}
          placeholder="Ej. picante, batch cooking…"
          maxTags={LIMITS.profileTagMaxCount}
          maxLength={LIMITS.profileTagMaxLength}
          hint="Las usaremos en pasos posteriores para afinar recomendaciones."
        />

        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.primary,
            pressed && styles.primaryPressed,
            submitting && styles.primaryDisabled,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>{submitting ? 'Guardando…' : 'Continuar'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  lead: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  dietGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dietChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  dietChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  dietLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  dietLabelSelected: {
    fontWeight: '600',
  },
  primary: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  primaryPressed: {
    opacity: 0.92,
  },
  primaryDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    ...typography.subtitle,
    color: colors.accentForeground,
  },
});
