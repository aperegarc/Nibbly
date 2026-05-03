import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useProfile } from '../../app/providers/ProfileProvider';
import type { Recipe } from '../../domain/entities/Recipe';
import type { UserPreferences } from '../../domain/entities/UserPreferences';
import { useRecipeTitleSearch } from '../hooks/useRecipeTitleSearch';
import type { FeedStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<FeedStackParamList, 'RecipeSearch'>;

export function RecipeSearchScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const [query, setQuery] = useState('');

  const preferences: UserPreferences = useMemo(
    () =>
      profile
        ? {
            diet: profile.diet,
            allergies: profile.allergies,
            preferences: profile.preferences,
          }
        : {
            diet: 'balanced',
            allergies: [],
            preferences: [],
          },
    [profile],
  );

  const { recipes, loading } = useRecipeTitleSearch(query, true, preferences);

  const renderItem = ({ item }: { item: Recipe }) => (
    <Pressable
      onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${item.title}`}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.rowMeta}>{item.cookTimeMinutes} min</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Título (mín. 2 letras)…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          accessibilityLabel="Buscar receta por título"
          returnKeyType="search"
        />
      </View>

      {query.trim().length > 0 && query.trim().length < 2 ? (
        <Text style={styles.hint}>Escribe al menos dos caracteres.</Text>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            query.trim().length >= 2 ? (
              <View style={styles.empty}>
                <Text style={styles.muted}>No hay recetas con ese título.</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.muted}>Busca por nombre; se respetan tus alergias del perfil.</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
    gap: spacing.sm,
  },
  centered: {
    paddingTop: spacing.xl * 2,
  },
  empty: {
    paddingTop: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
  },
  rowPressed: {
    opacity: 0.92,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  rowText: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
