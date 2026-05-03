import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../app/providers/AuthProvider';
import { useProfile } from '../../app/providers/ProfileProvider';
import { useShoppingList } from '../../app/providers/ShoppingListProvider';
import { useWeeklyMenu } from '../../app/providers/WeeklyMenuProvider';
import type { Recipe } from '../../domain/entities/Recipe';
import type { UserPreferences } from '../../domain/entities/UserPreferences';
import type { MealType, WeeklySlotRecipe } from '../../domain/entities/WeeklyMenu';
import {
  collectUniqueRecipeIdsFromWeek,
  getMondayBasedDayIndex,
  MEAL_LABELS,
  MEAL_ORDER,
} from '../../domain/entities/WeeklyMenu';
import { SupabaseRecipeRepository } from '../../infrastructure/repositories/SupabaseRecipeRepository';
import { StitchSubScreenHeader } from '../components/StitchSubScreenHeader';
import { useFavoriteRecipes } from '../hooks/useFavoriteRecipes';
import { useRecipeTitleSearch } from '../hooks/useRecipeTitleSearch';
import type { MainTabParamList } from '../navigation/types';
import type { WeeklyStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { elevation } from '../theme/shadows';
import { fontFamilies } from '../theme/fonts';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

type PickerTarget = { dayIndex: number; meal: MealType };

type PickerTab = 'favorites' | 'search';

function uniqueIngredientLabelsFromRecipes(recipes: Recipe[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      const t = ing.trim();
      if (!t) {
        continue;
      }
      const k = t.toLowerCase();
      if (seen.has(k)) {
        continue;
      }
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

type Props = NativeStackScreenProps<WeeklyStackParamList, 'WeeklyHome'>;

export function WeeklyMenuScreen({ navigation }: Props) {
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { profile } = useProfile();
  const userId = session?.user.id;
  const { assignments, setSlot, clearWeek, initialized, refresh } = useWeeklyMenu();
  const { items: shoppingItems, addItems, listSchemaMissing } = useShoppingList();
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => getMondayBasedDayIndex(new Date()));
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerTab, setPickerTab] = useState<PickerTab>('favorites');
  const [searchQuery, setSearchQuery] = useState('');
  const [shoppingFromMenuLoading, setShoppingFromMenuLoading] = useState(false);

  const todayIndex = getMondayBasedDayIndex(new Date());

  const preferences = useMemo(() => {
    if (!profile) {
      return null;
    }
    return {
      diet: profile.diet,
      allergies: profile.allergies,
      preferences: profile.preferences,
    };
  }, [profile]);

  const preferenceBundle: UserPreferences = useMemo(() => {
    if (!profile) {
      return { diet: 'balanced', allergies: [], preferences: [] };
    }
    return {
      diet: profile.diet,
      allergies: profile.allergies,
      preferences: profile.preferences,
    };
  }, [profile]);

  const { recipes: favorites, loading: favoritesLoading } = useFavoriteRecipes(userId, preferences);

  const searchEnabled = pickerTarget !== null && pickerTab === 'search';
  const { recipes: searchResults, loading: searchLoading } = useRecipeTitleSearch(
    searchQuery,
    searchEnabled,
    preferenceBundle,
  );

  const openPicker = (dayIndex: number, meal: MealType) => {
    setPickerTarget({ dayIndex, meal });
    setPickerTab('favorites');
    setSearchQuery('');
  };

  const handleBuildShoppingListFromMenu = useCallback(async () => {
    if (listSchemaMissing) {
      Alert.alert(
        'Lista no disponible',
        'Falta la tabla de lista en Supabase o aún no está sincronizada. Ejecuta la migración del proyecto y reintenta.',
      );
      return;
    }
    const ids = collectUniqueRecipeIdsFromWeek(assignments);
    if (ids.length === 0) {
      Alert.alert('Menú vacío', 'Asigna al menos una receta en la semana antes de generar la lista.');
      return;
    }

    setShoppingFromMenuLoading(true);
    try {
      const repo = new SupabaseRecipeRepository();
      const rows = await Promise.all(
        ids.map((recipeId) => repo.getById({ recipeId, preferences: preferenceBundle })),
      );
      const ok = rows.filter((r): r is Recipe => r !== null);
      if (ok.length === 0) {
        Alert.alert(
          'Sin recetas',
          'No se pudieron cargar las recetas del menú (revisa tu conexión o el perfil de alergias).',
        );
        return;
      }

      const labels = uniqueIngredientLabelsFromRecipes(ok);
      if (labels.length === 0) {
        Alert.alert(
          'Sin ingredientes',
          'Las recetas del menú no tienen ingredientes enlazados en la base de datos.',
        );
        return;
      }

      const existingLower = new Set(
        shoppingItems.map((i) => i.label.trim().toLowerCase()).filter((l) => l.length > 0),
      );
      const toAdd: string[] = [];
      let skipped = 0;
      for (const label of labels) {
        const k = label.toLowerCase();
        if (existingLower.has(k)) {
          skipped += 1;
          continue;
        }
        existingLower.add(k);
        toAdd.push(label);
      }

      if (toAdd.length > 0) {
        await addItems(toAdd);
      }

      const added = toAdd.length;
      const goList = () => navigation.getParent()?.navigate('ShoppingTab' as never);
      Alert.alert(
        'Lista actualizada',
        added > 0
          ? `Se añadieron ${added} ingrediente${added === 1 ? '' : 's'}.${skipped > 0 ? ` ${skipped} ya estaban en la lista.` : ''}`
          : 'Todos los ingredientes del menú ya figuraban en tu lista.',
        added > 0
          ? [
              { text: 'OK', style: 'default' as const },
              { text: 'Ver lista', onPress: goList },
            ]
          : [{ text: 'OK', style: 'default' as const }],
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo generar la lista.');
    } finally {
      setShoppingFromMenuLoading(false);
    }
  }, [
    addItems,
    assignments,
    listSchemaMissing,
    navigation,
    preferenceBundle,
    shoppingItems,
  ]);

  const onPickFavorite = (recipe: WeeklySlotRecipe) => {
    if (!pickerTarget) {
      return;
    }
    void setSlot(pickerTarget.dayIndex, pickerTarget.meal, recipe);
    setPickerTarget(null);
  };

  const closePicker = () => setPickerTarget(null);

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Inicia sesión para planificar tu semana.</Text>
      </View>
    );
  }

  if (!initialized) {
    return (
      <View style={styles.centered} accessibilityLabel="Cargando menú semanal">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StitchSubScreenHeader onRightPress={() => tabNavigation.navigate('FeedTab')} />
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeading}>
          <Text style={styles.pageTitle}>Menú semanal</Text>
          <Text style={styles.pageSubtitle}>Organiza tus comidas de la semana con facilidad.</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayChipsScroll}
        >
          {DAY_LABELS.map((label, dayIndex) => {
            const selected = dayIndex === selectedDayIndex;
            const isTodayChip = dayIndex === todayIndex;
            return (
              <Pressable
                key={label}
                onPress={() => setSelectedDayIndex(dayIndex)}
                style={[
                  styles.dayChip,
                  selected && styles.dayChipSelected,
                  isTodayChip && !selected && styles.dayChipTodayOutline,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={label}
              >
                <Text style={[styles.dayChipMainLabel, selected && styles.dayChipMainLabelSelected]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {(() => {
          const dayIndex = selectedDayIndex;
          const label = DAY_LABELS[dayIndex];
          const isToday = dayIndex === todayIndex;
          const daySlots = assignments[dayIndex] ?? { breakfast: null, lunch: null, dinner: null };
          return (
            <View key={label} style={[styles.dayCard, isToday && styles.dayCardToday]}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayTitle, isToday && styles.dayTitleToday]}>{label}</Text>
                {isToday ? (
                  <View style={styles.todayPill}>
                    <Text style={styles.todayPillText}>Hoy</Text>
                  </View>
                ) : null}
              </View>

              {MEAL_ORDER.map((meal) => {
                const slot = daySlots[meal];
                const mealLabel = MEAL_LABELS[meal];
                return (
                  <View key={meal} style={styles.mealBlock}>
                    <Text style={styles.mealLabel}>{mealLabel}</Text>
                    {slot ? (
                      <Pressable
                        onPress={() => navigation.navigate('RecipeDetail', { recipeId: slot.recipeId })}
                        style={styles.slotFilled}
                        accessibilityRole="button"
                        accessibilityLabel={`Ver ${slot.title}`}
                      >
                        <Image source={{ uri: slot.imageUrl }} style={styles.thumb} contentFit="cover" />
                        <View style={styles.slotText}>
                          <Text style={styles.slotTitle} numberOfLines={2}>
                            {slot.title}
                          </Text>
                          <Text style={styles.slotHint}>Ver receta</Text>
                        </View>
                      </Pressable>
                    ) : (
                      <Text style={styles.slotEmpty}>Sin asignar</Text>
                    )}
                    <View style={styles.mealActions}>
                      <Pressable
                        onPress={() => openPicker(dayIndex, meal)}
                        style={styles.pickButton}
                        accessibilityRole="button"
                        accessibilityLabel={`Elegir ${mealLabel} para ${label}`}
                      >
                        <Text style={styles.pickButtonText}>{slot ? 'Cambiar' : 'Elegir'}</Text>
                      </Pressable>
                      {slot ? (
                        <Pressable
                          onPress={() => void setSlot(dayIndex, meal, null)}
                          style={styles.removeButton}
                          accessibilityRole="button"
                        >
                          <Text style={styles.removeButtonText}>Quitar</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}

        <View style={styles.globalActions}>
          <Pressable
            onPress={() => void handleBuildShoppingListFromMenu()}
            disabled={shoppingFromMenuLoading || listSchemaMissing}
            style={({ pressed }) => [
              styles.actionPrimary,
              elevation.primaryButton,
              (shoppingFromMenuLoading || listSchemaMissing) && styles.actionDisabled,
              pressed && !shoppingFromMenuLoading && !listSchemaMissing && { opacity: 0.92 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Añadir ingredientes del menú a la lista de la compra"
          >
            {shoppingFromMenuLoading ? (
              <ActivityIndicator color={colors.accentForeground} />
            ) : (
              <>
                <Ionicons name="cart-outline" size={22} color={colors.accentForeground} />
                <Text style={styles.actionPrimaryText}>Añadir ingredientes a la lista</Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={() => void clearWeek()}
            style={({ pressed }) => [styles.actionGhost, pressed && { opacity: 0.88 }]}
            accessibilityRole="button"
            accessibilityLabel="Limpiar toda la semana"
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            <Text style={styles.actionGhostText}>Limpiar toda la semana</Text>
          </Pressable>
          {listSchemaMissing ? (
            <Text style={styles.shopFromWeekHint}>
              La lista de la compra no está disponible hasta que exista la tabla en Supabase.
            </Text>
          ) : (
            <Text style={styles.shopFromWeekHint}>
              Junta los ingredientes de todas las recetas asignadas (sin duplicar lo que ya tienes en la lista).
            </Text>
          )}
        </View>

        <Pressable onPress={() => void refresh()} style={styles.syncNote} accessibilityRole="button">
          <Text style={styles.syncNoteText}>Actualizar desde el servidor</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={pickerTarget !== null} animationType="slide" transparent onRequestClose={closePicker}>
        <KeyboardAvoidingView
          style={styles.modalAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
        >
        <Pressable style={styles.modalOverlay} onPress={closePicker}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {pickerTarget
                ? `${DAY_LABELS[pickerTarget.dayIndex]} · ${MEAL_LABELS[pickerTarget.meal]}`
                : ''}
            </Text>

            <View style={styles.modeRow}>
              <Pressable
                onPress={() => setPickerTab('favorites')}
                style={[styles.modeChip, pickerTab === 'favorites' && styles.modeChipOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: pickerTab === 'favorites' }}
              >
                <Text style={[styles.modeChipText, pickerTab === 'favorites' && styles.modeChipTextOn]}>
                  Favoritos
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPickerTab('search')}
                style={[styles.modeChip, pickerTab === 'search' && styles.modeChipOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: pickerTab === 'search' }}
              >
                <Text style={[styles.modeChipText, pickerTab === 'search' && styles.modeChipTextOn]}>
                  Buscar receta
                </Text>
              </Pressable>
            </View>

            {pickerTab === 'favorites' ? (
              favoritesLoading ? (
                <ActivityIndicator size="large" color={colors.accent} style={styles.modalLoading} />
              ) : favorites.length === 0 ? (
                <Text style={styles.muted}>
                  Aún no tienes favoritos. Cambia a «Buscar receta» o guarda recetas con el corazón en el feed.
                </Text>
              ) : (
                <FlatList
                  data={favorites}
                  keyExtractor={(item) => item.id}
                  style={styles.modalList}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.favRow}
                      onPress={() =>
                        onPickFavorite({
                          recipeId: item.id,
                          title: item.title,
                          imageUrl: item.imageUrl,
                        })
                      }
                    >
                      <Image source={{ uri: item.imageUrl }} style={styles.favThumb} contentFit="cover" />
                      <Text style={styles.favTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </Pressable>
                  )}
                />
              )
            ) : (
              <View style={styles.searchBlock}>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Escribe parte del título…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  accessibilityLabel="Buscar receta por título"
                />
                {searchLoading ? (
                  <ActivityIndicator size="small" color={colors.accent} style={styles.searchSpinner} />
                ) : null}
                {searchQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 ? (
                  <Text style={styles.muted}>No hay recetas con ese título.</Text>
                ) : null}
                {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 ? (
                  <Text style={styles.searchHint}>Escribe al menos 2 caracteres.</Text>
                ) : null}
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  style={styles.modalList}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.favRow}
                      onPress={() =>
                        onPickFavorite({
                          recipeId: item.id,
                          title: item.title,
                          imageUrl: item.imageUrl,
                        })
                      }
                    >
                      <Image source={{ uri: item.imageUrl }} style={styles.favThumb} contentFit="cover" />
                      <Text style={styles.favTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </Pressable>
                  )}
                />
              </View>
            )}
            <Pressable onPress={closePicker} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  pageHeading: {
    marginBottom: spacing.sm,
    gap: 4,
  },
  pageTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    letterSpacing: -0.45,
    color: colors.textPrimary,
  },
  pageSubtitle: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  dayChipsScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
  },
  dayChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceContainerHigh,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  dayChipTodayOutline: {
    borderColor: colors.accent,
  },
  dayChipMainLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  dayChipMainLabelSelected: {
    color: '#ffffff',
  },
  shopFromWeekHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  globalActions: {
    marginTop: spacing.lg,
    paddingTop: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
    gap: spacing.md,
  },
  actionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  actionPrimaryText: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    color: colors.accentForeground,
  },
  actionGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  actionGhostText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  dayCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  dayCardToday: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.accentSoft,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dayTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  dayTitleToday: {
    color: colors.accent,
  },
  todayPill: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  todayPillText: {
    ...typography.caption,
    color: colors.accentForeground,
    fontWeight: '700',
  },
  mealBlock: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  mealLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  slotFilled: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  slotText: {
    flex: 1,
    gap: 2,
  },
  slotTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  slotHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  slotEmpty: {
    ...typography.body,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  mealActions: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  pickButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
  },
  pickButtonText: {
    ...typography.subtitle,
    color: colors.accentForeground,
    fontSize: 14,
  },
  removeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  removeButtonText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  syncNote: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
  },
  syncNoteText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  modalAvoiding: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '78%',
  },
  modalTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  modeChipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  modeChipText: {
    ...typography.subtitle,
    color: colors.textSecondary,
    fontSize: 14,
  },
  modeChipTextOn: {
    color: colors.accent,
  },
  searchBlock: {
    gap: spacing.sm,
    flexGrow: 1,
  },
  searchInput: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  searchSpinner: {
    alignSelf: 'flex-start',
  },
  searchHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  modalLoading: {
    paddingVertical: spacing.xl,
  },
  modalList: {
    maxHeight: 360,
  },
  favRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  favThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  favTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  modalClose: {
    marginTop: spacing.md,
    alignSelf: 'center',
    padding: spacing.md,
  },
  modalCloseText: {
    ...typography.subtitle,
    color: colors.accent,
  },
});
