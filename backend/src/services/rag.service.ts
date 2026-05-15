import OpenAI from 'openai';
import { getSupabaseClient } from '../lib/supabase';
import type { ChatRequest } from '../types/schema';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MATCH_THRESHOLD = 0.3;
const MATCH_COUNT = 5;

export interface MatchedMenuItem {
  name: string;
  price: number;
  ingredients?: string[] | null;
  allergens?: string[] | null;
  description?: string | null;
  category?: string | null;
  similarity?: number;
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

  return (data ?? []) as MatchedMenuItem[];
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
        `Item: ${item.name} | Price: $${Number(item.price).toFixed(2)} | Ingredients: ${formatList(item.ingredients)} | Allergens: ${formatList(item.allergens)}`
    )
    .join('\n');
}

export async function buildRetrievedMenuContext(
  messages: ChatRequest['messages']
): Promise<string> {
  const query = getLastUserMessage(messages);
  const items = await retrieveMenuItems(query);
  return formatRetrievedContext(items);
}
