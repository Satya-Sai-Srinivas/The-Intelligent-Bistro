import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import '../config/env';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

interface MenuItemInput {
  name: string;
  description: string;
  price: number;
  category: string;
  ingredients: string[];
}

interface FailedMenuItem {
  item: MenuItemInput;
  error: string;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Add it to backend/.env (see .env.example).`);
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  itemName: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(
          `  [retry ${attempt}/${MAX_ATTEMPTS}] ${label} for "${itemName}" in ${delay}ms: ${formatError(err)}`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

function buildSemanticText(item: MenuItemInput): string {
  const ingredientList = item.ingredients.join(', ');
  return [
    `Name: ${item.name}`,
    `Description: ${item.description}`,
    `Category: ${item.category}`,
    `Price: $${item.price.toFixed(2)}`,
    `Ingredients: ${ingredientList}`,
  ].join('\n');
}

async function itemExistsByName(
  supabase: SupabaseClient,
  name: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id')
    .eq('name', name)
    .maybeSingle();

  if (error) {
    throw new Error(`Duplicate check failed: ${error.message}`);
  }

  return data != null;
}

async function createEmbedding(
  openai: OpenAI,
  item: MenuItemInput
): Promise<number[]> {
  const semanticText = buildSemanticText(item);
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: semanticText,
  });

  const embedding = embeddingResponse.data[0]?.embedding;
  if (!embedding) {
    throw new Error(`No embedding returned for "${item.name}"`);
  }

  return embedding;
}

async function insertMenuItem(
  supabase: SupabaseClient,
  item: MenuItemInput,
  embedding: number[]
): Promise<void> {
  const { error } = await supabase.from('menu_items').insert({
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    ingredients: item.ingredients,
    embedding,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_KEY?.trim();
  if (!supabaseKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY in backend/.env'
    );
  }

  const openaiKey = requireEnv('OPENAI_API_KEY');
  const openai = new OpenAI({ apiKey: openaiKey });
  const supabase = createClient(supabaseUrl, supabaseKey);

  const menuPath = path.resolve(__dirname, '../../menu.json');
  if (!fs.existsSync(menuPath)) {
    throw new Error(`menu.json not found at ${menuPath}`);
  }

  const raw = fs.readFileSync(menuPath, 'utf-8');
  const items = JSON.parse(raw) as MenuItemInput[];

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('menu.json must be a non-empty array of menu items');
  }

  const failedItems: FailedMenuItem[] = [];
  let seeded = 0;
  let skipped = 0;

  console.log(`Seeding ${items.length} menu item(s) into Supabase...\n`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const progress = `[${i + 1}/${items.length}]`;

    try {
      const exists = await withRetry(
        'duplicate check',
        () => itemExistsByName(supabase, item.name),
        item.name
      );

      if (exists) {
        console.log(`${progress} ⊘ skip (already exists): ${item.name}`);
        skipped += 1;
        continue;
      }

      const embedding = await withRetry(
        'OpenAI embedding',
        () => createEmbedding(openai, item),
        item.name
      );

      await withRetry(
        'Supabase insert',
        () => insertMenuItem(supabase, item, embedding),
        item.name
      );

      console.log(`${progress} ✓ seeded: ${item.name}`);
      seeded += 1;
    } catch (err) {
      const errorMessage = formatError(err);
      console.error(`${progress} ✗ failed after ${MAX_ATTEMPTS} attempts: ${item.name}`);
      console.error(`    ${errorMessage}`);
      failedItems.push({ item, error: errorMessage });
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Seeded:  ${seeded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed:  ${failedItems.length}`);

  if (failedItems.length > 0) {
    const failedPath = path.resolve(__dirname, '../../failed_menu.json');
    fs.writeFileSync(failedPath, JSON.stringify(failedItems, null, 2), 'utf-8');
    console.log(`\nWrote ${failedItems.length} failed item(s) to ${failedPath}`);
    process.exit(1);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
