import type { MenuItem } from '../types/menu';

const catalogById = new Map<string, number>();

export function setMenuCatalog(items: MenuItem[]): void {
  catalogById.clear();
  for (const item of items) {
    catalogById.set(String(item.id), item.price);
  }
}

export function getMenuItemPrice(itemId: string): number | null {
  const price = catalogById.get(String(itemId));
  return price != null ? price : null;
}
