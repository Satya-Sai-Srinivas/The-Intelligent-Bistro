/**
 * Legacy static menu sample (production ordering uses Supabase + RAG item IDs).
 */
export const BISTRO_MENU_JSON = [
  {
    name: 'Spicy Chicken Sandwich',
    price: 12.0,
    category: 'mains',
    ingredients: ['fried chicken breast', 'brioche bun', 'spicy mayo', 'pickles', 'lettuce'],
    allergens: ['gluten', 'eggs', 'soy'],
  },
  {
    name: 'Classic Burger',
    price: 10.0,
    category: 'mains',
    ingredients: ['angus beef patty', 'sesame bun', 'cheddar cheese', 'lettuce', 'tomato', 'special sauce'],
    allergens: ['gluten', 'dairy', 'eggs', 'soy'],
  },
  {
    name: 'Truffle Fries',
    price: 6.0,
    category: 'sides',
    ingredients: ['russet potatoes', 'truffle oil', 'parmesan cheese', 'parsley', 'sea salt'],
    allergens: ['dairy'],
  },
  {
    name: 'Large Water',
    price: 2.0,
    category: 'drinks',
    ingredients: ['filtered water', 'ice'],
    allergens: [],
  },
  {
    name: 'Decaf Coffee',
    price: 3.0,
    category: 'drinks',
    ingredients: ['decaf arabica coffee', 'hot water'],
    allergens: [],
  },
] as const;
