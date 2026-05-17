import '../config/env';
import { createClient } from '@supabase/supabase-js';

const UNSPLASH_SEARCH_URL = 'https://api.unsplash.com/search/photos';
const DELAY_MS = 2000;
const BATCH_LIMIT = 5;

interface MenuItemRow {
  id: string;
  name: string;
}

interface UnsplashSearchResponse {
  results: Array<{ urls: { regular: string } }>;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Add it to backend/.env (see .env.example).`);
  }
  return value;
}

const supabaseUrl = requireEnv('SUPABASE_URL');
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function searchUnsplashImage(
  itemName: string,
  accessKey: string
): Promise<string | null> {
  const query = encodeURIComponent(`${itemName} food plated`);
  const url = `${UNSPLASH_SEARCH_URL}?query=${query}&per_page=1&orientation=landscape`;

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Unsplash API error ${response.status} ${response.statusText}${body ? `: ${body}` : ''}`
    );
  }

  const data = (await response.json()) as UnsplashSearchResponse;

  if (!data.results?.length) {
    return null;
  }

  return data.results[0].urls.regular ?? null;
}

async function main(): Promise<void> {
  const accessKey = requireEnv('UNSPLASH_ACCESS_KEY');

  const { data, error } = await supabaseAdmin
    .from('menu_items')
    .select('id, name')
    .is('image_url', null)
    .limit(BATCH_LIMIT);

  if (error) {
    console.error(`Failed to fetch menu items: ${error.message}`);
    process.exit(1);
  }

  const items = (data ?? []) as MenuItemRow[];

  if (items.length === 0) {
    console.log('No items need images. All menu items already have image_url set.');
    return;
  }

  console.log(`Processing ${items.length} menu item(s) (max ${BATCH_LIMIT} per run)...\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const progress = `[${i + 1}/${items.length}]`;

    try {
      const imageUrl = await searchUnsplashImage(item.name, accessKey);

      if (!imageUrl) {
        console.warn(`${progress} ⚠ No Unsplash results for: ${item.name}`);
        skipped += 1;
      } else {
        const { error: updateError } = await supabaseAdmin
          .from('menu_items')
          .update({ image_url: imageUrl })
          .eq('id', item.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        console.log(`${progress} ✅ Updated ${item.name} with Unsplash image`);
        updated += 1;
      }
    } catch (err) {
      console.error(`${progress} ✗ Failed for ${item.name}: ${formatError(err)}`);
      failed += 1;
    }

    if (i < items.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no results): ${skipped}`);
  console.log(`Failed:  ${failed}`);

  if (updated === 0 && failed > 0) {
    process.exit(1);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
