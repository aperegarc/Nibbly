import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RecipeDifficulty } from '../../domain/entities/Recipe';
import type { RecipeFilters } from '../../domain/repositories/RecipeRepository';
import { COUNTRY_OPTIONS } from '../constants/countryOptions';
import { DIET_OPTIONS } from '../constants/dietOptions';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  visible: boolean;
  initial: RecipeFilters;
  onClose: () => void;
  onApply: (next: RecipeFilters) => void;
  shoppingListForFeed: boolean;
  onApplyShoppingListForFeed: (active: boolean) => void;
  shoppingPendingCount: number;
  listSchemaMissing: boolean;
};

const DIFFICULTY_OPTIONS: { value: RecipeDifficulty; label: string }[] = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Media' },
  { value: 'hard', label: 'Difícil' },
];

const TIME_OPTIONS: { label: string; value?: number }[] = [
  { label: 'Cualquiera', value: undefined },
  { label: '≤ 15 min', value: 15 },
  { label: '≤ 30 min', value: 30 },
  { label: '≤ 45 min', value: 45 },
  { label: '≤ 60 min', value: 60 },
  { label: '≤ 120 min', value: 120 },
];

export function RecipeFilterModal({
  visible,
  initial,
  onClose,
  onApply,
  shoppingListForFeed,
  onApplyShoppingListForFeed,
  shoppingPendingCount,
  listSchemaMissing,
}: Props) {
  const [draft, setDraft] = useState<RecipeFilters>(initial);
  const [draftListFilter, setDraftListFilter] = useState(shoppingListForFeed);

  useEffect(() => {
    if (visible) {
      setDraft(initial);
      setDraftListFilter(shoppingListForFeed);
    }
  }, [initial, shoppingListForFeed, visible]);

  const apply = () => {
    onApply(draft);
    const listOk = draftListFilter && !listSchemaMissing && shoppingPendingCount > 0;
    onApplyShoppingListForFeed(listOk);
    onClose();
  };

  const clearAll = () => {
    setDraft({});
    setDraftListFilter(false);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.avoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar filtros">
            <Text style={styles.link}>Cerrar</Text>
          </Pressable>
          <Text style={styles.title}>Filtros</Text>
          <Pressable onPress={clearAll} accessibilityRole="button" accessibilityLabel="Limpiar filtros">
            <Text style={styles.link}>Limpiar</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.section}>Lista de la compra</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>Solo recetas con mis pendientes</Text>
              <Text style={styles.switchCaption}>
                {listSchemaMissing
                  ? 'Lista no disponible en el servidor.'
                  : shoppingPendingCount === 0
                    ? 'Añade ítems en la pestaña Lista.'
                    : `${shoppingPendingCount} pendiente${shoppingPendingCount === 1 ? '' : 's'}: ingredientes de la receta deben estar en la lista.`}
              </Text>
            </View>
            <Switch
              value={draftListFilter}
              onValueChange={setDraftListFilter}
              disabled={listSchemaMissing || shoppingPendingCount === 0}
              trackColor={{ false: colors.border, true: colors.accentSoft }}
              thumbColor={draftListFilter ? colors.accent : colors.surface}
              accessibilityLabel="Filtrar recetas según lista de la compra"
            />
          </View>

          <Text style={styles.section}>Dieta</Text>
          <View style={styles.rowWrap}>
            <FilterChip
              label="Cualquiera"
              selected={!draft.diet}
              onPress={() => setDraft((prev) => ({ ...prev, diet: undefined }))}
            />
            {DIET_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={draft.diet === option.value}
                onPress={() => setDraft((prev) => ({ ...prev, diet: option.value }))}
              />
            ))}
          </View>

          <Text style={styles.section}>Tiempo máximo</Text>
          <View style={styles.rowWrap}>
            {TIME_OPTIONS.map((option) => (
              <FilterChip
                key={option.label}
                label={option.label}
                selected={
                  option.value === undefined
                    ? draft.maxCookTimeMinutes === undefined
                    : draft.maxCookTimeMinutes === option.value
                }
                onPress={() =>
                  setDraft((prev) => ({
                    ...prev,
                    maxCookTimeMinutes: option.value,
                  }))
                }
              />
            ))}
          </View>

          <Text style={styles.section}>Dificultad</Text>
          <View style={styles.rowWrap}>
            <FilterChip
              label="Cualquiera"
              selected={!draft.difficulty}
              onPress={() => setDraft((prev) => ({ ...prev, difficulty: undefined }))}
            />
            {DIFFICULTY_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={draft.difficulty === option.value}
                onPress={() =>
                  setDraft((prev) => ({
                    ...prev,
                    difficulty: option.value as RecipeDifficulty,
                  }))
                }
              />
            ))}
          </View>

          <Text style={styles.section}>País / cocina</Text>
          <View style={styles.rowWrap}>
            <FilterChip
              label="Cualquiera"
              selected={!draft.country}
              onPress={() => setDraft((prev) => ({ ...prev, country: undefined }))}
            />
            {COUNTRY_OPTIONS.map((country) => (
              <FilterChip
                key={country}
                label={country}
                selected={draft.country === country}
                onPress={() => setDraft((prev) => ({ ...prev, country }))}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={apply} style={styles.primary} accessibilityRole="button">
            <Text style={styles.primaryText}>Aplicar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avoid: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  link: {
    ...typography.subtitle,
    color: colors.accent,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  section: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  chipLabelSelected: {
    fontFamily: fontFamilies.semiBold,
    color: colors.textPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
  },
  switchText: {
    flex: 1,
    gap: 4,
  },
  switchTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 15,
  },
  switchCaption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  primaryText: {
    ...typography.subtitle,
    color: colors.accentForeground,
  },
});
