import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import { z } from 'zod';
import '../config/env';

const CATEGORIES = [
  'Appetizers',
  'Salads',
  'Burgers & Sandwiches',
  'Pasta',
  'Chicken Dishes',
  'Steaks & Chops',
  'Seafood',
  'Pizzas',
  'Cheesecakes & Desserts',
  'Beverages',
] as const;

const ITEMS_PER_CATEGORY = 25;
const MODEL = 'gpt-4o-2024-08-06';

const MenuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  category: z.string().min(1),
  ingredients: z.array(z.string()).min(1),
  allergens: z.array(z.string()),
});

const CategoryBatchSchema = z.object({
  items: z.array(MenuItemSchema).length(ITEMS_PER_CATEGORY),
});

/** OpenAI strict JSON Schema (zodResponseFormat is incompatible with Zod v4 in this project). */
const CATEGORY_BATCH_JSON_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          category: { type: 'string' },
          ingredients: {
            type: 'array',
            items: { type: 'string' },
          },
          allergens: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['name', 'description', 'price', 'category', 'ingredients', 'allergens'],
        additionalProperties: false,
      },
      minItems: ITEMS_PER_CATEGORY,
      maxItems: ITEMS_PER_CATEGORY,
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const;

type MenuItem = z.infer<typeof MenuItemSchema>;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Add it to backend/.env`);
  }
  return value;
}

function buildCategoryPrompt(category: string): string {
  return `You are a senior menu developer for a large American casual-dining chain (Cheesecake Factory scale).

Generate exactly ${ITEMS_PER_CATEGORY} highly realistic, unique menu items for the category: "${category}".

Requirements for every item:
- name: distinctive, restaurant-style (no duplicates within this batch)
- description: mouth-watering, 2-3 sentences, specific cooking techniques and flavors
- price: realistic USD restaurant pricing for this category (appetizers $8-18, entrees $16-42, desserts $8-14, beverages $4-9, etc.)
- category: must be exactly "${category}"
- ingredients: comprehensive array (6-12 items typical)
- allergens: array of standard labels when applicable — e.g. "Dairy", "Gluten", "Eggs", "Soy", "Shellfish", "Fish", "Tree Nuts", "Peanuts", "Sesame" — or [] if none

Do not repeat item names. Vary cuisines, preparations, and price points within the category.`;
}

async function generateCategoryBatch(
  openai: OpenAI,
  category: string
): Promise<MenuItem[]> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You output structured JSON only. Follow the schema exactly.',
      },
      { role: 'user', content: buildCategoryPrompt(category) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'menu_category_batch',
        strict: true,
        schema: CATEGORY_BATCH_JSON_SCHEMA,
      },
    },
    temperature: 0.9,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`No response content for category "${category}"`);
  }

  const parsed = CategoryBatchSchema.parse(JSON.parse(content));

  return parsed.items.map((item) => ({
    ...item,
    category,
  }));
}

async function main(): Promise<void> {
  const openai = new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') });
  const allItems: MenuItem[] = [];

  console.log(
    `Generating menu: ${CATEGORIES.length} categories x ${ITEMS_PER_CATEGORY} items...\n`
  );

  for (const category of CATEGORIES) {
    process.stdout.write(`Generating ${category}... `);
    const items = await generateCategoryBatch(openai, category);
    allItems.push(...items);
    console.log(`done (${items.length} items, ${allItems.length} total)`);
  }

  const menuPath = path.resolve(__dirname, '../../menu.json');
  await fs.writeFile(menuPath, JSON.stringify(allItems, null, 2), 'utf-8');

  console.log(`\nWrote ${allItems.length} items to ${menuPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
