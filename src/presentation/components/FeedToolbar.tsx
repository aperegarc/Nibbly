import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LIMITS } from '../../shared/utils/limits';
import { Nibbly } from './nibbly/Nibbly';
import type { NibblyState } from './nibbly/nibblyTypes';
import { TagChipsEditor } from './TagChipsEditor';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  ingredientTags: string[];
  onAddIngredient: (value: string) => void;
  onRemoveIngredient: (value: string) => void;
  onOpenFilters: () => void;
  onOpenSurprise?: () => void;
};

const TOOLBAR_MASCOT_CYCLE: NibblyState[] = ['feliz', 'alegre', 'celebrando', 'pensativa', 'dudosa', 'cocinera'];

export function FeedToolbar({
  ingredientTags,
  onAddIngredient,
  onRemoveIngredient,
  onOpenFilters,
  onOpenSurprise,
}: Props) {
  const [mascotIdx, setMascotIdx] = useState(0);

  const advanceMascot = useCallback(() => {
    setMascotIdx((i) => (i + 1) % TOOLBAR_MASCOT_CYCLE.length);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandBlock}>
          <Nibbly
            state={TOOLBAR_MASCOT_CYCLE[mascotIdx]}
            size={52}
            onPress={advanceMascot}
            accessibilityLabel="Nibbly, toca para cambiar de humor"
          />
          <View style={styles.brandText}>
            <Text style={styles.brandName}>Nibbly</Text>
            <Text style={styles.brandHint}>Toca la mascota</Text>
          </View>
        </View>
        <View style={styles.actionsRow}>
          <Pressable
            onPress={onOpenFilters}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Filtros y lista de la compra"
          >
            <Text style={styles.actionBtnText}>Filtros</Text>
          </Pressable>
          {onOpenSurprise ? (
            <Pressable
              onPress={onOpenSurprise}
              style={({ pressed }) => [styles.surpriseBtn, pressed && styles.actionBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Sorpréndeme: tiempo, nevera y lista"
            >
              <Text style={styles.surpriseBtnText}>Sorpréndeme</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <TagChipsEditor
        label=""
        tags={ingredientTags}
        onAdd={onAddIngredient}
        onRemove={onRemoveIngredient}
        placeholder="Añade ingredientes…"
        maxTags={LIMITS.discoveryTagMaxCount}
        maxLength={LIMITS.discoveryTagMaxLength}
        hint=""
        useCatalogIngredients
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.toolbar,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  brandText: {
    flexShrink: 1,
    gap: 2,
  },
  brandName: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  brandHint: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flexShrink: 0,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: colors.chipBorder,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  surpriseBtn: {
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accentWarm,
  },
  actionBtnPressed: {
    opacity: 0.88,
  },
  actionBtnText: {
    ...typography.subtitle,
    color: colors.accent,
    fontSize: 14,
  },
  surpriseBtnText: {
    ...typography.subtitle,
    color: colors.accentWarmForeground,
    fontSize: 14,
  },
});
