import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useAuth } from '../../app/providers/AuthProvider';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  variant?: 'text' | 'icon';
};

export function SignOutHeaderButton({ variant = 'text' }: Props) {
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      hitSlop={8}
    >
      {busy ? (
        <ActivityIndicator color={colors.accent} />
      ) : variant === 'icon' ? (
        <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
      ) : (
        <Text style={styles.label}>Salir</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    ...typography.subtitle,
    color: colors.accent,
  },
});
