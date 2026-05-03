import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../../app/providers/AuthProvider';
import { useShoppingList } from '../../app/providers/ShoppingListProvider';
import type { ShoppingListItem } from '../../domain/entities/ShoppingListItem';
import { LIMITS } from '../../shared/utils/limits';
import { CatalogIngredientInput } from '../components/CatalogIngredientInput';
import { Nibbly } from '../components/nibbly';
import { StitchSubScreenHeader } from '../components/StitchSubScreenHeader';
import type { MainTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { elevation } from '../theme/shadows';
import { fontFamilies } from '../theme/fonts';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export function ShoppingListScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { session } = useAuth();
  const userId = session?.user.id;
  const {
    items,
    loading,
    listSchemaMissing,
    refresh,
    addItem,
    setItemChecked,
    removeItem,
    useShoppingListForFeedFilter,
    setUseShoppingListForFeedFilter,
  } = useShoppingList();

  const onAdd = async (canonicalName: string) => {
    if (!userId) {
      return;
    }
    try {
      await addItem(canonicalName);
    } catch (e) {
      console.error(e);
    }
  };

  const shareMessage = useMemo(() => {
    const pending = items.filter((i) => !i.checked);
    const bought = items.filter((i) => i.checked);
    const lines: string[] = ['Nibbly — lista de la compra', ''];
    if (pending.length > 0) {
      lines.push('Pendientes:');
      for (const i of pending) {
        lines.push(`• ${i.label}`);
      }
    }
    if (bought.length > 0) {
      lines.push('');
      lines.push('Ya comprados:');
      for (const i of bought) {
        lines.push(`• ${i.label}`);
      }
    }
    if (pending.length === 0 && bought.length === 0) {
      lines.push('(Lista vacía)');
    }
    return lines.join('\n');
  }, [items]);

  const onShare = useCallback(async () => {
    try {
      await Share.share({ message: shareMessage, title: 'Lista de la compra' });
    } catch {
      /* usuario canceló o error de sistema */
    }
  }, [shareMessage]);

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Inicia sesión para usar la lista.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <StitchSubScreenHeader onRightPress={() => navigation.navigate('FeedTab')} />
      <View style={styles.flexGrow}>
        <View style={styles.pageHeading}>
          <Text style={styles.pageTitle}>Lista de la compra</Text>
          <Text style={styles.pageSubtitle}>Organiza tus ingredientes para la semana.</Text>
        </View>

      {!listSchemaMissing ? (
        <View style={styles.filterCard}>
          <View style={styles.filterCardTop}>
            <Switch
              value={useShoppingListForFeedFilter}
              onValueChange={setUseShoppingListForFeedFilter}
              trackColor={{ false: colors.border, true: colors.accentSoft }}
              thumbColor={useShoppingListForFeedFilter ? colors.accent : colors.surface}
              accessibilityLabel="Usar pendientes como filtro en el feed"
            />
            <Text style={styles.filterInlineLabel}>Usar pendientes como filtro en el feed</Text>
          </View>
          <Pressable
            onPress={() => void onShare()}
            style={({ pressed }) => [styles.sharePill, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
            accessibilityLabel="Compartir lista como texto"
          >
            <Ionicons name="share-outline" size={20} color={colors.onSecondary} />
            <Text style={styles.sharePillText}>Compartir lista como texto</Text>
          </Pressable>
        </View>
      ) : null}

      {listSchemaMissing ? (
        <View style={styles.schemaBanner}>
          <Text style={styles.schemaBannerText}>
            No se puede sincronizar la lista: falta la tabla en Supabase. Ejecuta la migración SQL del proyecto y
            tira hacia abajo para reintentar.
          </Text>
          <Pressable
            onPress={() => void refresh()}
            style={styles.schemaRetry}
            accessibilityRole="button"
            accessibilityLabel="Reintentar cargar la lista"
          >
            <Text style={styles.schemaRetryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.addRow, listSchemaMissing && styles.addRowDisabled]}>
        <CatalogIngredientInput
          variant="pill"
          onCommit={(name) => void onAdd(name)}
          disabled={listSchemaMissing}
          maxLength={LIMITS.shoppingItemMaxLength}
          placeholder="Añadir nuevo ingrediente…"
          accessibilityInputLabel="Nuevo ítem de lista"
          accessibilityAddLabel="Añadir a la lista"
        />
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            items.length > 0 ? (
              <View style={styles.listFooterMascot}>
                <Nibbly state="pensativa" size={112} accessibilityLabel="Nibbly pensativo" />
                <Text style={styles.footerHint}>¿Olvidaste algo importante?</Text>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void refresh()}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          renderItem={({ item }) => (
            <ShoppingRow
              item={item}
              onToggle={() => void setItemChecked(item.id, !item.checked)}
              onRemove={() => void removeItem(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Nibbly
                state="dudosa"
                size={120}
                accessibilityLabel="Nibbly: lista vacía"
                style={{ marginBottom: spacing.md }}
              />
              <Text style={styles.muted}>
                {listSchemaMissing
                  ? 'Cuando la base de datos esté lista, podrás guardar ítems aquí.'
                  : 'Tu lista está vacía. ¡Empieza añadiendo ingredientes!'}
              </Text>
            </View>
          }
        />
      )}
    </View>
    </KeyboardAvoidingView>
  );
}

function ShoppingRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingListItem;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        style={styles.checkHit}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        accessibilityLabel={item.checked ? 'Marcar como pendiente' : 'Marcar como comprado'}
        hitSlop={8}
      >
        <View style={[styles.checkbox, item.checked && styles.checkboxOn]}>
          {item.checked ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
      </Pressable>
      <Pressable onPress={onToggle} style={styles.labelHit} accessibilityRole="button">
        <Text style={[styles.label, item.checked && styles.labelDone]}>{item.label}</Text>
      </Pressable>
      <Pressable
        onPress={onRemove}
        style={({ pressed }) => [styles.removeHit, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={`Quitar ${item.label}`}
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={22} color={colors.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeading: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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
  filterCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(233, 225, 220, 0.35)',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  filterCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  filterInlineLabel: {
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  sharePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    ...elevation.cardSoft,
  },
  sharePillText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    color: colors.onSecondary,
  },
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flexGrow: {
    flex: 1,
  },
  schemaBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#FFFBEB',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: spacing.sm,
  },
  schemaBannerText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  schemaRetry: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
  },
  schemaRetryText: {
    ...typography.subtitle,
    color: colors.accentForeground,
  },
  addRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  addRowDisabled: {
    opacity: 0.55,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.sm,
  },
  listFooterMascot: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
    marginTop: spacing.lg,
  },
  footerHint: {
    ...typography.body,
    fontStyle: 'italic',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  empty: {
    paddingVertical: spacing.xl * 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 66, 0.08)',
    ...elevation.cardSoft,
  },
  checkHit: {
    paddingVertical: spacing.xs,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  checkMark: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '700',
  },
  labelHit: {
    flex: 1,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
  },
  labelDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  removeHit: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
});
