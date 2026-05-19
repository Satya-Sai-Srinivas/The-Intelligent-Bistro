import OpenAI from 'openai';
import { getSupabaseClient } from '../lib/supabase';
import type { ChatRequest } from '../types/schema';
import { normalizeMenuItemId } from '../utils/menuItemId';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MATCH_THRESHOLD = 0.3;
const MATCH_COUNT = 5;

export interface MatchedMenuItem {
  id: string;
  name: string;
  price: number;
  ingredients?: string[] | null;
  allergens?: string[] | null;
  description?: string | null;
  category?: string | null;
  similarity?: number;
}

export interface RetrievedMenuContext {
  items: MatchedMenuItem[];
  context: string;
  allowedItemIds: Set<string>;
}

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Copy backend/.env.example to backend/.env and add your key.'
    );
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export function getLastUserMessage(messages: ChatRequest['messages']): string {
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user') {
    throw new Error('Last message must be from the user');
  }
  return last.content;
}

function normalizeMatchedRow(row: Record<string, unknown>): MatchedMenuItem | null {
  const id = normalizeMenuItemId(row.id as string | number | null | undefined);
  if (!id) return null;

  const name = typeof row.name === 'string' ? row.name : String(row.name ?? '');
  const price = Number(row.price);
  if (!name || Number.isNaN(price)) return null;

  return {
    id,
    name,
    price,
    ingredients: (row.ingredients as string[] | null | undefined) ?? null,
    allergens: (row.allergens as string[] | null | undefined) ?? null,
    description: (row.description as string | null | undefined) ?? null,
    category: (row.category as string | null | undefined) ?? null,
    similarity: typeof row.similarity === 'number' ? row.similarity : undefined,
  };
}

export async function embedQuery(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    throw new Error('No embedding returned for query');
  }
  return embedding;
}

export async function retrieveMenuItems(queryText: string): Promise<MatchedMenuItem[]> {
  const embedding = await embedQuery(queryText);
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('match_menu_items', {
    query_embedding: embedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: MATCH_COUNT,
  });

  if (error) {
    throw new Error(`match_menu_items failed: ${error.message}`);
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  return rows
    .map((row) => normalizeMatchedRow(row))
    .filter((item): item is MatchedMenuItem => item != null);
}

function formatList(value: string[] | null | undefined): string {
  if (!value?.length) return 'None listed';
  return value.join(', ');
}

export function formatRetrievedContext(items: MatchedMenuItem[]): string {
  if (items.length === 0) return '(No matching menu items found.)';
  return items
    .map(
      (item) =>
        `ID: ${item.id} | Name: ${item.name} | Price: $${item.price.toFixed(2)} | Ingredients: ${formatList(item.ingredients)} | Allergens: ${formatList(item.allergens)}`
    )
    .join('\n');
}

export async function buildRetrievedMenuContextForQuery(
  queryText: string
): Promise<RetrievedMenuContext> {
  const items = await retrieveMenuItems(queryText);
  return {
    items,
    context: formatRetrievedContext(items),
    allowedItemIds: new Set(items.map((item) => item.id)),
  };
}

export async function buildRetrievedMenuContext(
  messages: ChatRequest['messages']
): Promise<string> {
  const { context } = await buildRetrievedMenuContextForQuery(getLastUserMessage(messages));
  return context;
}
