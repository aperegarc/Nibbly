import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { LIMITS } from '../../shared/utils/limits';
import { TagChipsEditor } from './TagChipsEditor';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { spacing } from '../theme/spacing';

type Props = {
  ingredientTags: string[];
  onAddIngredient: (value: string) => void;
  onRemoveIngredient: (value: string) => void;
};

export function FeedToolbar({ ingredientTags, onAddIngredient, onRemoveIngredient }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHead}>
        <Ionicons name="restaurant-outline" size={16} color={colors.textMuted} />
        <Text style={styles.sectionLabel}>Tengo en mi nevera</Text>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
});
