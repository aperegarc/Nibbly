import type { ShoppingListItem } from '../../domain/entities/ShoppingListItem';
import type { ShoppingListRepository } from '../../domain/repositories/ShoppingListRepository';
import { AppError } from '../../shared/errors/AppError';
import { getSupabaseClient } from '../supabase/client';

type Row = {
  id: string;
  label: string;
  checked: boolean;
  sort_order: number;
};

function mapRow(row: Row): ShoppingListItem {
  return {
    id: row.id,
    label: row.label.trim(),
    checked: row.checked,
    sortOrder: row.sort_order,
  };
}

export class SupabaseShoppingListRepository implements ShoppingListRepository {
  public async listByUser(userId: string): Promise<ShoppingListItem[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('id, label, checked, sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppError(error.message || 'No se pudo cargar la lista.', 'SHOPPING_LIST_FETCH_FAILED');
    }

    return (data as Row[] | null)?.map(mapRow) ?? [];
  }

  public async addItem(userId: string, label: string): Promise<ShoppingListItem> {
    const supabase = getSupabaseClient();
    const trimmed = label.trim();
    const { data: maxRow } = await supabase
      .from('shopping_list_items')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxRow?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('shopping_list_items')
      .insert({
        user_id: userId,
        label: trimmed,
        checked: false,
        sort_order: nextOrder,
      })
      .select('id, label, checked, sort_order')
      .single();

    if (error || !data) {
      throw new AppError(error?.message || 'No se pudo añadir el ítem.', 'SHOPPING_LIST_INSERT_FAILED');
    }

    return mapRow(data as Row);
  }

  public async addItems(userId: string, labels: string[]): Promise<ShoppingListItem[]> {
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const raw of labels) {
      const t = raw.trim();
      if (!t) {
        continue;
      }
      const k = t.toLowerCase();
      if (seen.has(k)) {
        continue;
      }
      seen.add(k);
      deduped.push(t);
    }
    if (deduped.length === 0) {
      return [];
    }

    const supabase = getSupabaseClient();
    const { data: maxRow } = await supabase
      .from('shopping_list_items')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextOrder = (maxRow?.sort_order ?? -1) + 1;
    const insertRows = deduped.map((label, i) => ({
      user_id: userId,
      label,
      checked: false,
      sort_order: nextOrder + i,
    }));

    const { data, error } = await supabase
      .from('shopping_list_items')
      .insert(insertRows)
      .select('id, label, checked, sort_order');

    if (error || !data) {
      throw new AppError(error?.message || 'No se pudieron añadir los ítems.', 'SHOPPING_LIST_INSERT_FAILED');
    }

    return (data as Row[]).map(mapRow);
  }

  public async setChecked(userId: string, itemId: string, checked: boolean): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('shopping_list_items')
      .update({ checked })
      .eq('id', itemId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(error.message || 'No se pudo actualizar el ítem.', 'SHOPPING_LIST_UPDATE_FAILED');
    }
  }

  public async removeItem(userId: string, itemId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('shopping_list_items').delete().eq('id', itemId).eq('user_id', userId);

    if (error) {
      throw new AppError(error.message || 'No se pudo borrar el ítem.', 'SHOPPING_LIST_DELETE_FAILED');
    }
  }
}
