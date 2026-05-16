export const MENU_ITEMS = [
  { id: '1', name: 'Spicy Chicken Sandwich', description: 'Crispy, hot, and delicious.', price: 12.0 },
  { id: '2', name: 'Classic Burger', description: '100% Angus beef.', price: 10.0 },
  { id: '3', name: 'Truffle Fries', description: 'With parmesan and herbs.', price: 6.0 },
  { id: '4', name: 'Large Water', description: 'Ice cold.', price: 2.0 },
  { id: '5', name: 'Decaf Coffee', description: 'Locally roasted.', price: 3.0 },
] as const;

export function resolveMenuItemId(itemName: string): string | null {
  const normalized = itemName.trim().toLowerCase();
  const match = MENU_ITEMS.find(
    (item) =>
      item.name.toLowerCase() === normalized ||
      normalized.includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(normalized)
  );
  return match?.name ?? null;
}

export function getMenuItemPrice(itemId: string): number {
  const normalized = itemId.toLowerCase();
  const match = MENU_ITEMS.find(
    (item) =>
      item.name.toLowerCase() === normalized ||
      item.id === itemId ||
      normalized.includes(item.name.toLowerCase())
  );
  return match?.price ?? 10.0;
}
