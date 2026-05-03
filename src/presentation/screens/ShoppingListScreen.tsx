import { useNavigation } from '@react-navigation/native';
import { useCallback, useLayoutEffect, useMemo } from 'react';
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
import { SignOutHeaderButton } from '../components/SignOutHeaderButton';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export function ShoppingListScreen() {
  const navigation = useNavigation();
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

  useLayoutEffect(() => {
    if (!userId) {
      navigation.setOptions({
        headerRight: () => <SignOutHeaderButton />,
      });
      return;
    }
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => void onShare()}
            style={styles.headerLink}
            accessibilityRole="button"
            accessibilityLabel="Compartir lista"
            hitSlop={8}
          >
            <Text style={styles.headerLinkText}>Compartir</Text>
          </Pressable>
          <SignOutHeaderButton />
        </View>
      ),
    });
  }, [navigation, onShare, userId]);

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
    <View style={styles.flexGrow}>
      <View style={styles.intro}>
        <Text style={styles.introText}>
          Añade ítems del catálogo. Si activas el filtro en Recetas, solo verás platos cuyos ingredientes estén todos
          entre tus pendientes (la receta puede usar solo parte de la lista).
        </Text>
      </View>

      {!listSchemaMissing ? (
        <View style={styles.filterSwitchRow}>
          <View style={styles.filterSwitchText}>
            <Text style={styles.filterSwitchTitle}>Filtrar recetas con esta lista</Text>
            <Text style={styles.filterSwitchCaption}>
              En Recetas, solo aparecen recetas que puedes hacer con esos pendientes (todo ingrediente de la receta
              debe estar en la lista). Puedes combinarlo con «en casa».
            </Text>
          </View>
          <Switch
            value={useShoppingListForFeedFilter}
            onValueChange={setUseShoppingListForFeedFilter}
            trackColor={{ false: colors.border, true: colors.accentSoft }}
            thumbColor={useShoppingListForFeedFilter ? colors.accent : colors.surface}
            accessibilityLabel="Usar lista de la compra para filtrar el feed de recetas"
          />
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
          onCommit={(name) => void onAdd(name)}
          disabled={listSchemaMissing}
          maxLength={LIMITS.shoppingItemMaxLength}
          placeholder="Busca en el catálogo…"
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
              <Text style={styles.muted}>
                {listSchemaMissing
                  ? 'Cuando la base de datos esté lista, podrás guardar ítems aquí.'
                  : 'Tu lista está vacía. Añade lo que tengas en mente comprar.'}
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
        style={styles.removeHit}
        accessibilityRole="button"
        accessibilityLabel={`Quitar ${item.label}`}
        hitSlop={8}
      >
        <Text style={styles.removeText}>Quitar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerLink: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerLinkText: {
    ...typography.subtitle,
    color: colors.accent,
  },
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flexGrow: {
    flex: 1,
  },
  intro: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  introText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  filterSwitchRow: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  filterSwitchText: {
    flex: 1,
    gap: 4,
  },
  filterSwitchTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  filterSwitchCaption: {
    ...typography.caption,
    color: colors.textSecondary,
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
    paddingBottom: spacing.xl,
    gap: spacing.sm,
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
    padding: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
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
  removeText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
});
