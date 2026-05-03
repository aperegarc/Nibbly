import { useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useIngredientSearch } from '../hooks/useIngredientSearch';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  onCommit: (canonicalName: string) => void | Promise<void>;
  disabled?: boolean;
  maxLength: number;
  placeholder?: string;
  addLabel?: string;
  accessibilityInputLabel?: string;
  accessibilityAddLabel?: string;
};

export function CatalogIngredientInput({
  onCommit,
  disabled = false,
  maxLength,
  placeholder = 'Busca en el catálogo…',
  addLabel = 'Añadir',
  accessibilityInputLabel = 'Buscar ingrediente del catálogo',
  accessibilityAddLabel = 'Añadir ingrediente',
}: Props) {
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState<string | null>(null);

  const suggestionsEnabled = !disabled && draft.trim().length >= 2;
  const suggestions = useIngredientSearch(draft, suggestionsEnabled);

  const commitWithName = async (canonicalName: string) => {
    const name = canonicalName.trim();
    if (!name || disabled) {
      return;
    }
    setHint(null);
    await onCommit(name);
    setDraft('');
    Keyboard.dismiss();
  };

  const tryCommit = async () => {
    setHint(null);
    const value = draft.trim();
    if (!value) {
      return;
    }
    if (value.length < 2) {
      setHint('Escribe al menos 2 letras.');
      return;
    }

    const lower = value.toLowerCase();
    const exact = suggestions.find((s) => s.toLowerCase() === lower);
    if (exact) {
      await commitWithName(exact);
      return;
    }

    if (suggestions.length === 1) {
      await commitWithName(suggestions[0]);
      return;
    }

    setHint('Toca una sugerencia de la lista o afinar la búsqueda.');
  };

  const showEmptyState =
    suggestionsEnabled && suggestions.length === 0 && draft.trim().length >= 2;

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={(t) => {
            setDraft(t);
            setHint(null);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, disabled && styles.inputDisabled]}
          maxLength={maxLength}
          onSubmitEditing={() => void tryCommit()}
          returnKeyType="done"
          accessibilityLabel={accessibilityInputLabel}
          editable={!disabled}
        />
        <Pressable
          onPress={() => void tryCommit()}
          disabled={disabled}
          style={({ pressed }) => [
            styles.addButton,
            disabled && styles.addButtonDisabled,
            pressed && !disabled && styles.addButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={accessibilityAddLabel}
        >
          <Text style={[styles.addLabel, disabled && styles.addLabelMuted]}>{addLabel}</Text>
        </Pressable>
      </View>

      {hint ? <Text style={styles.hintError}>{hint}</Text> : null}

      {showEmptyState ? (
        <Text style={styles.emptyCatalog}>No hay coincidencias en el catálogo. Prueba otro nombre.</Text>
      ) : null}

      {suggestions.length > 0 ? (
        <View style={styles.suggestBox}>
          <Text style={styles.suggestTitle}>Ingredientes del catálogo</Text>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.suggestScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {suggestions.map((name) => (
              <Pressable
                key={name}
                onPress={() => void commitWithName(name)}
                style={({ pressed }) => [styles.suggestRow, pressed && styles.suggestRowPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Elegir ${name}`}
              >
                <Text style={styles.suggestText}>{name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    ...typography.body,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    minHeight: 48,
  },
  inputDisabled: {
    opacity: 0.55,
  },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    minHeight: 48,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: colors.border,
  },
  addButtonPressed: {
    opacity: 0.9,
  },
  addLabel: {
    ...typography.subtitle,
    color: colors.accentForeground,
  },
  addLabelMuted: {
    color: colors.textSecondary,
  },
  hintError: {
    ...typography.caption,
    color: colors.danger,
  },
  emptyCatalog: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  suggestBox: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestTitle: {
    ...typography.caption,
    fontFamily: fontFamilies.semiBold,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  suggestScroll: {
    maxHeight: 168,
  },
  suggestRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  suggestRowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  suggestText: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
