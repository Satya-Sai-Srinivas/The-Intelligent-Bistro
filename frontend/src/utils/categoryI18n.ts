const CATEGORY_KEY_BY_DB_NAME: Record<string, string> = {
  Appetizers: 'appetizers',
  Salads: 'salads',
  'Burgers & Sandwiches': 'burgersAndSandwiches',
  Pasta: 'pasta',
  'Chicken Dishes': 'chickenDishes',
  'Steaks & Chops': 'steaksAndChops',
  Seafood: 'seafood',
  Pizzas: 'pizzas',
  'Cheesecakes & Desserts': 'cheesecakesAndDesserts',
  Beverages: 'beverages',
};

type TranslateFn = (
  key: string,
  options?: { defaultValue?: string; count?: number }
) => string;

export function translateCategory(category: string, t: TranslateFn): string {
  const slug = CATEGORY_KEY_BY_DB_NAME[category];
  if (!slug) {
    return category;
  }
  return t(`categories.${slug}`, { defaultValue: category });
}
