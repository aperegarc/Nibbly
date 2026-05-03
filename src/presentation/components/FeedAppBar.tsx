import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../app/providers/AuthProvider';
import { Nibbly } from './nibbly/Nibbly';
import type { NibblyState } from './nibbly/nibblyTypes';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { spacing } from '../theme/spacing';

const MASCOT_CYCLE: NibblyState[] = ['feliz', 'alegre', 'celebrando', 'pensativa', 'dudosa', 'cocinera'];

type Props = {
  onSearch: () => void;
  onOpenFilters: () => void;
  onOpenSurprise?: () => void;
};

export function FeedAppBar({ onSearch, onOpenFilters, onOpenSurprise }: Props) {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [mascotIdx, setMascotIdx] = useState(0);

  const advanceMascot = useCallback(() => {
    setMascotIdx((i) => (i + 1) % MASCOT_CYCLE.length);
  }, []);

  const openMoreMenu = useCallback(() => {
    const signOutAction = () => {
      void signOut();
    };
    if (Platform.OS === 'ios') {
      Alert.alert('Cuenta', undefined, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: signOutAction },
      ]);
    } else {
      Alert.alert('Cuenta', undefined, [
        { text: 'Cerrar sesión', onPress: signOutAction },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  }, [signOut]);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        <View style={styles.brandBlock}>
          <Pressable
            onPress={advanceMascot}
            style={styles.mascotRing}
            accessibilityRole="button"
            accessibilityLabel="Nibbly, toca para cambiar de humor"
          >
            <Nibbly state={MASCOT_CYCLE[mascotIdx]} size={40} />
          </Pressable>
          <View style={styles.brandText}>
            <Text style={styles.brandName} numberOfLines={1}>
              Nibbly
            </Text>
            <Text style={styles.brandHint} numberOfLines={1}>
              Toca la mascota para cambiar estado
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onSearch}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Buscar recetas por título"
            hitSlop={8}
          >
            <Ionicons name="search-outline" size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={onOpenFilters}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Filtros y lista de la compra"
            hitSlop={8}
          >
            <Ionicons name="options-outline" size={22} color={colors.textMuted} />
          </Pressable>
          {onOpenSurprise ? (
            <Pressable
              onPress={onOpenSurprise}
              style={({ pressed }) => [styles.surpriseBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Sorpréndeme: tiempo, nevera y lista"
            >
              <Ionicons name="dice-outline" size={18} color="#ffffff" />
              <Text style={styles.surpriseText}>Sorpréndeme</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={openMoreMenu}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Más opciones y cerrar sesión"
            hitSlop={8}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.headerBar,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.headerBarBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 40,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    minHeight: 56,
    gap: spacing.sm,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  mascotRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.mascotBorder,
    backgroundColor: colors.mascotBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: fontFamilies.display,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.surpriseOrange,
  },
  brandHint: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 99,
  },
  iconBtnPressed: {
    backgroundColor: 'rgba(255, 237, 213, 0.85)',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  surpriseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
    backgroundColor: colors.surpriseOrange,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: colors.surpriseOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  surpriseText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    color: '#ffffff',
  },
});
