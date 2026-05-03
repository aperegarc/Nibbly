import { Ionicons } from '@expo/vector-icons';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../app/providers/AuthProvider';
import { Nibbly } from './nibbly/Nibbly';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { spacing } from '../theme/spacing';

type Props = {
  /** Icono derecho tipo Stitch (nevera / cocina) */
  rightIcon?: 'kitchen' | 'none';
  onRightPress?: () => void;
};

export function StitchSubScreenHeader({ rightIcon = 'kitchen', onRightPress }: Props) {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  const openAccountMenu = () => {
    const run = () => {
      void signOut();
    };
    if (Platform.OS === 'ios') {
      Alert.alert('Cuenta', undefined, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: run },
      ]);
    } else {
      Alert.alert('Cuenta', undefined, [
        { text: 'Cerrar sesión', onPress: run },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        <View style={styles.brandBlock}>
          <View style={styles.mascotRing}>
            <Nibbly state="feliz" size={32} />
          </View>
          <Text style={styles.brandName}>Nibbly</Text>
        </View>
        <View style={styles.right}>
          {rightIcon === 'kitchen' ? (
            <Pressable
              onPress={onRightPress}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Ir a explorar recetas"
              hitSlop={8}
            >
              <Ionicons name="restaurant-outline" size={22} color={colors.textMuted} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={openAccountMenu}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Cuenta"
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
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    minHeight: 52,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mascotRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    backgroundColor: colors.mascotBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandName: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.surpriseOrange,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 99,
  },
  iconBtnPressed: {
    backgroundColor: 'rgba(255, 237, 213, 0.85)',
  },
});
