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

import { CatalogIngredientInput } from './CatalogIngredientInput';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  label?: string;
  tags: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder?: string;
  maxTags: number;
  maxLength?: number;
  hint?: string;
  testID?: string;
  /** Solo nombres del catálogo Supabase, con sugerencias al escribir. */
  useCatalogIngredients?: boolean;
};

export function TagChipsEditor({
  label,
  tags,
  onAdd,
  onRemove,
  placeholder = 'Escribe y pulsa añadir',
  maxTags,
  maxLength = 80,
  hint,
  testID,
  useCatalogIngredients = false,
}: Props) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const value = draft.trim();
    if (!value) {
      return;
    }
    if (tags.length >= maxTags) {
      return;
    }
    onAdd(value);
    setDraft('');
    Keyboard.dismiss();
  };

  return (
    <View style={styles.block} testID={testID}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {useCatalogIngredients ? (
        <CatalogIngredientInput
          onCommit={(name) => {
            if (tags.length >= maxTags) {
              return;
            }
            onAdd(name);
          }}
          disabled={tags.length >= maxTags}
          maxLength={maxLength}
          placeholder={placeholder}
          accessibilityInputLabel={`Campo para ${label ?? 'ingredientes del catálogo'}`}
          accessibilityAddLabel={`Añadir a ${label ?? 'etiquetas'}`}
        />
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            maxLength={maxLength}
            onSubmitEditing={commit}
            returnKeyType="done"
            accessibilityLabel={`Campo para ${label ?? 'etiquetas'}`}
          />
          <Pressable
            onPress={commit}
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Añadir etiqueta a ${label}`}
          >
            <Text style={styles.addLabel}>Añadir</Text>
          </Pressable>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {tags.map((tag) => (
          <Pressable
            key={tag}
            onPress={() => onRemove(tag)}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${tag}`}
          >
            <Text style={styles.chipText}>{tag}</Text>
            <Text style={styles.chipClose}>×</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
  },
  label: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.body,
    color: colors.textSecondary,
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
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    minHeight: 48,
    justifyContent: 'center',
  },
  addButtonPressed: {
    opacity: 0.9,
  },
  addLabel: {
    ...typography.subtitle,
    color: colors.accentForeground,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surfaceCard,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  chipClose: {
    ...typography.subtitle,
    fontSize: 15,
    color: colors.accentSecondary,
  },
});
