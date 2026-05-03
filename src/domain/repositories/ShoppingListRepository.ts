import type { ShoppingListItem } from '../entities/ShoppingListItem';

export interface ShoppingListRepository {
  listByUser(userId: string): Promise<ShoppingListItem[]>;
  addItem(userId: string, label: string): Promise<ShoppingListItem>;
  /** Inserción en bloque (una respuesta) para no disparar N actualizaciones en el cliente. */
  addItems(userId: string, labels: string[]): Promise<ShoppingListItem[]>;
  setChecked(userId: string, itemId: string, checked: boolean): Promise<void>;
  removeItem(userId: string, itemId: string): Promise<void>;
}
