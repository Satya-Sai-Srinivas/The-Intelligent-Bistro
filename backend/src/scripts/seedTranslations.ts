import '../config/env';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { z } from 'zod';

const TARGET_LANGUAGES = ['es', 'fr', 'de', 'zh', 'te', 'hi', 'kn', 'ta', 'ml'] as const;
const OPENAI_DELAY_MS = 1000;
const CHAT_MODEL = 'gpt-4o-mini';

type TranslationEntry = { name: string; description: string };
type TranslationsMap = Record<string, TranslationEntry>;

interface MenuItemRow {
  id: string;
  name: string;
  description: string;
  translations: TranslationsMap | null;
}

interface FailedItem {
  id: string;
  name: string;
  error: string;
}

const TranslationEntrySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

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

function getMissingLanguages(translations: TranslationsMap | null): string[] {
  return TARGET_LANGUAGES.filter(
    (code) => !translations?.[code]?.name || !translations?.[code]?.description
  );
}

function buildTranslationPrompt(item: MenuItemRow, languageCodes: string[]): string {
  return `You are a professional culinary translator. Translate the following menu item name and description into the requested languages. Return ONLY a valid JSON object where the keys are the 2-letter language codes (e.g., "es", "te"), and the values are objects containing "name" and "description" strings.

Requested languages: ${languageCodes.join(', ')}

Name: ${item.name}
Description: ${item.description}`;
}

function parseTranslationResponse(
  raw: string,
  expectedCodes: string[],
  itemName: string
): TranslationsMap {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON from OpenAI for "${itemName}"`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Expected JSON object for "${itemName}"`);
  }

  const record = parsed as Record<string, unknown>;
  const result: TranslationsMap = {};

  for (const code of expectedCodes) {
    const entry = record[code];
    const validated = TranslationEntrySchema.safeParse(entry);
    if (!validated.success) {
      throw new Error(
        `Missing or invalid translation for "${code}" on "${itemName}": ${validated.error.message}`
      );
    }
    result[code] = validated.data;
  }

  const unexpected = Object.keys(record).filter((key) => !expectedCodes.includes(key));
  if (unexpected.length > 0) {
    throw new Error(
      `Unexpected language keys for "${itemName}": ${unexpected.join(', ')}`
    );
  }

  return result;
}

async function translateMenuItem(
  openai: OpenAI,
  item: MenuItemRow,
  languageCodes: string[]
): Promise<TranslationsMap> {
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You output structured JSON only.',
      },
      {
        role: 'user',
        content: buildTranslationPrompt(item, languageCodes),
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`OpenAI returned empty content for "${item.name}"`);
  }

  return parseTranslationResponse(content, languageCodes, item.name);
}

async function updateTranslations(
  supabase: SupabaseClient,
  itemId: string,
  existing: TranslationsMap | null,
  newTranslations: TranslationsMap
): Promise<void> {
  const merged: TranslationsMap = {
    ...(existing ?? {}),
    ...newTranslations,
  };

  const { error } = await supabase
    .from('menu_items')
    .update({ translations: merged })
    .eq('id', itemId);

  if (error) {
    throw new Error(error.message);
  }
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const openaiKey = requireEnv('OPENAI_API_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const openai = new OpenAI({ apiKey: openaiKey });

  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, description, translations')
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch menu items: ${error.message}`);
  }

  const items = (data ?? []) as MenuItemRow[];

  if (items.length === 0) {
    console.log('No menu items found.');
    return;
  }

  const toProcess = items.filter((item) => getMissingLanguages(item.translations).length > 0);
  const skipped = items.length - toProcess.length;

  console.log(
    `Found ${items.length} menu item(s). ${toProcess.length} need translation(s), ${skipped} already complete.\n`
  );

  if (toProcess.length === 0) {
    console.log('All items have full translations. Nothing to do.');
    return;
  }

  const failed: FailedItem[] = [];
  let translated = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const item = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;
    const missing = getMissingLanguages(item.translations);

    try {
      const newTranslations = await translateMenuItem(openai, item, missing);
      await updateTranslations(supabase, item.id, item.translations, newTranslations);

      console.log(`${progress} ✓ ${item.name} (+${missing.join(', ')})`);
      translated += 1;
    } catch (err) {
      const errorMessage = formatError(err);
      console.error(`${progress} ✗ ${item.name}: ${errorMessage}`);
      failed.push({ id: item.id, name: item.name, error: errorMessage });
    }

    if (i < toProcess.length - 1) {
      await sleep(OPENAI_DELAY_MS);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Translated: ${translated}`);
  console.log(`Skipped:    ${skipped} (already had all locales)`);
  console.log(`Failed:     ${failed.length}`);

  if (failed.length > 0) {
    for (const f of failed) {
      console.error(`  - ${f.name} (${f.id}): ${f.error}`);
    }
    process.exit(1);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
