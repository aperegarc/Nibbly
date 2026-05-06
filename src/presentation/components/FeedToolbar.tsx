import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { spacing } from '../theme/spacing';

type Props = {
  onSearch: () => void;
};

export function FeedToolbar({ onSearch }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onSearch}
        style={({ pressed }) => [styles.searchBtn, pressed && styles.searchBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Buscar recetas por nombre"
      >
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <Text style={styles.searchBtnText}>Buscar por nombre</Text>
      </Pressable>
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
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceCard,
  },
  searchBtnPressed: {
    opacity: 0.9,
  },
  searchBtnText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
