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

import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type TimePreset = { label: string; minutes?: number; hint: string };

const TIME_PRESETS: TimePreset[] = [
  { label: 'Rápido', minutes: 25, hint: 'Poco tiempo' },
  { label: 'Normal', minutes: 45, hint: 'Equilibrado' },
  { label: 'Sin prisa', minutes: undefined, hint: 'Cualquier duración' },
];

export type QuickDecideResult = {
  maxCookTimeMinutes?: number;
  pantryOnly: boolean;
  /** Si true, el feed usa el filtro por lista pendiente (puede combinarse con nevera). */
  useShoppingListForFeed: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  pantryTagCount: number;
  matchPantryIngredients: boolean;
  shoppingListFilterActive: boolean;
  shoppingPendingCount: number;
  maxCookTimeMinutes?: number;
  onComplete: (opts: QuickDecideResult, surprise: boolean) => void;
};

export function QuickDecideModal({
  visible,
  onClose,
  pantryTagCount,
  matchPantryIngredients,
  shoppingListFilterActive,
  shoppingPendingCount,
  maxCookTimeMinutes,
  onComplete,
}: Props) {
  const [minutes, setMinutes] = useState<number | undefined>(maxCookTimeMinutes);
  const [pantryOnly, setPantryOnly] = useState(matchPantryIngredients);
  const [useList, setUseList] = useState(shoppingListFilterActive);

  useEffect(() => {
    if (visible) {
      setMinutes(maxCookTimeMinutes);
      setPantryOnly(pantryTagCount > 0 ? matchPantryIngredients : false);
      setUseList(shoppingPendingCount > 0 ? shoppingListFilterActive : false);
    }
  }, [
    visible,
    maxCookTimeMinutes,
    matchPantryIngredients,
    pantryTagCount,
    shoppingListFilterActive,
    shoppingPendingCount,
  ]);

  const finish = (surprise: boolean) => {
    const pantryOnlyEffective = pantryTagCount > 0 && pantryOnly;
    const listEffective = shoppingPendingCount > 0 && useList;
    onComplete(
      {
        maxCookTimeMinutes: minutes,
        pantryOnly: pantryOnlyEffective,
        useShoppingListForFeed: listEffective,
      },
      surprise,
    );
    onClose();
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
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Text style={styles.link}>Cerrar</Text>
          </Pressable>
          <Text style={styles.title}>Sorpréndeme</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lead}>
            Tiempo, nevera y lista se pueden usar solos o juntos. «Sorpréndeme ya» baraja y salta a una receta al
            azar.
          </Text>

          <Text style={styles.section}>Tiempo</Text>
          <View style={styles.rowWrap}>
            {TIME_PRESETS.map((p) => {
              const selected =
                p.minutes === undefined ? minutes === undefined : minutes === p.minutes;
              return (
                <Pressable
                  key={p.label}
                  onPress={() => setMinutes(p.minutes)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{p.label}</Text>
                  <Text style={[styles.chipHint, selected && styles.chipHintSelected]}>{p.hint}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>Nevera (ingredientes de arriba)</Text>
              <Text style={styles.switchCaption}>
                {pantryTagCount === 0
                  ? 'Añade ingredientes en el feed para activar.'
                  : `Al menos uno de ${pantryTagCount} ingrediente${pantryTagCount === 1 ? '' : 's'}.`}
              </Text>
            </View>
            <Switch
              value={pantryTagCount > 0 && pantryOnly}
              onValueChange={(v) => {
                if (pantryTagCount > 0) {
                  setPantryOnly(v);
                }
              }}
              disabled={pantryTagCount === 0}
              trackColor={{ false: colors.border, true: colors.accentSoft }}
              thumbColor={pantryTagCount > 0 && pantryOnly ? colors.accent : colors.surface}
              accessibilityLabel="Filtrar por ingredientes en casa"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>Mi lista de la compra</Text>
              <Text style={styles.switchCaption}>
                {shoppingPendingCount === 0
                  ? 'Añade pendientes en la pestaña Lista.'
                  : 'Solo platos que puedas hacer con esos ítems.'}
              </Text>
            </View>
            <Switch
              value={shoppingPendingCount > 0 && useList}
              onValueChange={(v) => {
                if (shoppingPendingCount > 0) {
                  setUseList(v);
                }
              }}
              disabled={shoppingPendingCount === 0}
              trackColor={{ false: colors.border, true: colors.accentSoft }}
              thumbColor={shoppingPendingCount > 0 && useList ? colors.accent : colors.surface}
              accessibilityLabel="Filtrar por lista de la compra"
            />
          </View>

          <Pressable
            style={styles.primary}
            onPress={() => finish(false)}
            accessibilityRole="button"
            accessibilityLabel="Aplicar y ver recetas"
          >
            <Text style={styles.primaryText}>Ver recetas</Text>
          </Pressable>

          <Pressable
            style={styles.surprise}
            onPress={() => finish(true)}
            accessibilityRole="button"
            accessibilityLabel="Sorpréndeme con una receta al azar"
          >
            <Text style={styles.surpriseText}>Sorpréndeme ya</Text>
            <Text style={styles.surpriseSub}>Baraja y abre una receta al azar</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
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
    borderBottomColor: colors.borderSoft,
  },
  headerSpacer: {
    width: 56,
  },
  link: {
    ...typography.subtitle,
    color: colors.accent,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  lead: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minWidth: '28%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    gap: 4,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontSize: 15,
  },
  chipTextSelected: {
    color: colors.accent,
  },
  chipHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  chipHintSelected: {
    color: colors.textSecondary,
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
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  primaryText: {
    ...typography.subtitle,
    color: colors.accentForeground,
  },
  surprise: {
    borderWidth: 2,
    borderColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceCard,
  },
  surpriseText: {
    ...typography.subtitle,
    color: colors.accent,
    fontSize: 17,
  },
  surpriseSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
