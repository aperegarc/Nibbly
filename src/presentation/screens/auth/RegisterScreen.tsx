import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../../app/providers/AuthProvider';
import { Nibbly } from '../../components/nibbly/Nibbly';
import type { AuthStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { normalizeEmail, validateEmail, validatePassword } from '../../../shared/utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    setFormError(null);
    setInfoMessage(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setFormError(emailError);
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    setSubmitting(true);
    const outcome = await signUp(normalizeEmail(email), password);
    setSubmitting(false);

    if (outcome.errorMessage) {
      setFormError(outcome.errorMessage);
      return;
    }

    if (outcome.needsEmailConfirmation) {
      setInfoMessage('Te hemos enviado un enlace para confirmar el correo. Después podrás entrar.');
      return;
    }

    setInfoMessage('Cuenta lista. Ya puedes usar la app.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Nibbly state="alegre" size={80} style={styles.mascot} accessibilityLabel="Nibbly" />
          <Text style={styles.brand}>Únete a Nibbly</Text>
          <Text style={styles.lead}>Crea tu cuenta con correo y contraseña.</Text>

          <Text style={styles.label} nativeID="register-email-label">
            Correo
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            placeholder="tu@correo.com"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            accessibilityLabel="Correo electrónico"
            accessibilityLabelledBy="register-email-label"
            editable={!submitting}
          />

          <Text style={styles.label} nativeID="register-password-label">
            Contraseña
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            accessibilityLabel="Contraseña"
            accessibilityLabelledBy="register-password-label"
            editable={!submitting}
          />

          {formError ? (
            <Text style={styles.error} accessibilityRole="alert">
              {formError}
            </Text>
          ) : null}

          {infoMessage ? (
            <Text style={styles.info} accessibilityRole="summary">
              {infoMessage}
            </Text>
          ) : null}

          <Pressable
            onPress={onSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              submitting && styles.primaryButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting }}
          >
            <Text style={styles.primaryButtonText}>{submitting ? 'Creando…' : 'Crear cuenta'}</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Login')}
            disabled={submitting}
            style={styles.secondaryPressable}
            accessibilityRole="button"
            accessibilityLabel="Ir a iniciar sesión"
          >
            <Text style={styles.secondaryText}>¿Ya tienes cuenta? Entrar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  mascot: {
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  brand: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  lead: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    minHeight: 52,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  info: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  primaryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...typography.subtitle,
    color: colors.accentForeground,
  },
  secondaryPressable: {
    marginTop: spacing.lg,
    alignItems: 'center',
    padding: spacing.sm,
  },
  secondaryText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
  },
});
