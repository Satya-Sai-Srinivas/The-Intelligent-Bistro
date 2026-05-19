import OpenAI from 'openai';
import '../config/env';
import { AI_ORDER_RESPONSE_JSON_SCHEMA } from '../types/ai-json-schema';
import {
  AiOrderClientPayload,
  AiOrderResponseSchema,
  ChatRequest,
  type OrderAction,
} from '../types/schema';
import { normalizeMenuItemId } from '../utils/menuItemId';
import {
  buildRetrievedMenuContextForQuery,
  getLastUserMessage,
} from './rag.service';

const CHAT_MODEL = 'gpt-4o-mini';

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

function buildSystemPrompt(
  currentCart: ChatRequest['currentCart'],
  retrievedContext: string
): string {
  return `You are the Intelligent Bistro AI Concierge. Parse the user's natural language request and update their shopping cart.

RETRIEVED CONTEXT: Here are the ONLY menu items relevant to the user's request:
${retrievedContext}

You must formulate your cart actions and conversational responses based STRICTLY on this retrieved data. Do not hallucinate items.

Current cart:
${JSON.stringify(currentCart)}

Response format (JSON only):
1. "reasoning" — Plan first: which menu items match, what cart changes are needed, dietary/allergy checks, and edge cases. **You MUST include this exact line in your reasoning (answer Yes or No):** "Did the user explicitly confirm this item? Yes/No." For each distinct cart mutation you are about to output in actions, the answer must be Yes. If you are only suggesting, upselling, or offering an alternative, the answer is No and actions must be []. Do this before choosing actions.
2. "conversationalResponse" — Polite, concise reply for the customer.
3. "actions" — Array of cart operations. Each entry has:
   - actionType: ADD | REMOVE | UPDATE_QUANTITY | NONE
   - itemId: exact menu item ID (string) from RETRIEVED CONTEXT or null when not applicable
   - quantity: number or null when not applicable
4. "ui_action" — null, or { type: "change_language", languageCode: "<iso>" } when switching app language (see LANGUAGE below)

EXPLICIT CONSENT: You must NEVER add an item to the actions array unless the user has explicitly requested it or confirmed a prior suggestion in this conversation (e.g., clear "yes", "add it", "sure", "please add that"). If you are suggesting an alternative, proposing an upsell, asking "would you like…?", or offering a swap that the user has not yet accepted, the actions array MUST be [] (empty). Do not use ADD for unsolicited suggestions.

TWO-STEP UPSELLING: When proposing a new item (e.g., "Would you like to add Firecracker Shrimp?"), put only that text in conversationalResponse and output [] for actions. Wait for the user's next message with explicit agreement before outputting any ADD (or other mutation) for that item in a subsequent turn.

REASONING CHECK: In your reasoning field, you must explicitly state: "Did the user explicitly confirm this item? Yes/No." If No for every item you might otherwise add, do not mutate the cart — use actions: [].

Rules:
- Compound requests need multiple action objects only when the user explicitly asked for multiple items or quantities in the same turn (e.g. burger + fries, each clearly requested or confirmed).
- Chat-only, pure acknowledgment, or any reply that only suggests/asks without a firm user order change: use actions: [] or, if appropriate, a single NONE entry with nulls — never ADD something the user did not request or confirm.
- NO GUESSING: If the user asks for an item that is not explicitly listed in the RETRIEVED CONTEXT, decline politely in conversationalResponse and output actions: []. Do not attempt to find a "close enough" match unless explicitly asking the user for confirmation first.
- itemId must be an exact ID string present in RETRIEVED CONTEXT; never invent names or IDs.
- Always be polite and concise in conversationalResponse.

MEMORY: Review the conversation history. If the user uses pronouns (e.g., "make it three", "remove that"), infer the target item from previous turns. Still apply EXPLICIT CONSENT: only mutate the cart if the combined history shows a clear request or confirmation.

AMBIGUITY: If a request is vague (e.g., "I want a sandwich"), DO NOT guess. Output an empty actions array, and use the conversationalResponse to ask them to clarify which specific item they meant.

DIETARY LOGIC: You must use your reasoning field to cross-reference the user's requested items against any stated allergies or dietary preferences found in the conversation history (e.g., gluten-free, nut allergy, vegetarian). If an item violates a constraint, refuse it by outputting an empty actions array and politely suggesting a safe alternative in the conversationalResponse. **That alternative is only text in conversationalResponse until the user explicitly confirms** — then and only then add the confirmed item via ADD in a later turn.

UPSELLING: When the user's order seems complete, you may suggest a logical pairing from RETRIEVED CONTEXT only in conversationalResponse. **Never** put the suggested pairing in actions in the same turn. Follow TWO-STEP UPSELLING: wait for explicit user confirmation before any ADD for that suggestion. Only suggest items that fit any known dietary constraints.

LANGUAGE: If the user speaks a foreign language, explicitly asks to translate the menu, or requests a different language, you MUST detect their language, respond to them in that language, and output the ui_action field with type: "change_language" and the corresponding 2-letter ISO 639-1 language code (e.g. "es", "te", "hi", "fr", "zh"). Supported codes: en, fr, de, zh, te, es, hi, kn, ta, ml. When no language change is needed, set ui_action to null.`;
}

function filterActionsToRetrievedContext(
  actions: OrderAction[],
  allowedItemIds: Set<string>,
  currentCart: ChatRequest['currentCart']
): OrderAction[] {
  const cartIds = new Set(currentCart.map((c) => String(c.itemId)));

  return actions.filter((action) => {
    if (action.actionType === 'NONE') return true;

    const itemId = normalizeMenuItemId(action.itemId);
    if (!itemId) return false;

    if (action.actionType === 'ADD') {
      return allowedItemIds.has(itemId);
    }

    if (action.actionType === 'REMOVE' || action.actionType === 'UPDATE_QUANTITY') {
      return allowedItemIds.has(itemId) || cartIds.has(itemId);
    }

    return false;
  });
}

function logDroppedActions(original: OrderAction[], filtered: OrderAction[]): void {
  if (process.env.NODE_ENV === 'production' || original.length === filtered.length) {
    return;
  }

  const kept = new Set(filtered);
  const dropped = original.filter((action) => !kept.has(action));
  if (dropped.length > 0) {
    console.warn('[ai.service] Dropped cart actions not allowed by retrieved context:', dropped);
  }
}

async function prepareChatContext(chatRequest: ChatRequest): Promise<{
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  allowedItemIds: Set<string>;
}> {
  const { context, allowedItemIds } = await buildRetrievedMenuContextForQuery(
    getLastUserMessage(chatRequest.messages)
  );

  if (allowedItemIds.size === 0 && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[ai.service] RAG returned no menu item IDs — verify match_menu_items returns id.'
    );
  }

  return {
    allowedItemIds,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(chatRequest.currentCart, context),
      },
      ...chatRequest.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ],
  };
}

/** Parse partial streamed JSON and return the conversationalResponse string so far. */
function parsePartialConversationalResponse(contentBuffer: string): string {
  const key = '"conversationalResponse"';
  const keyIndex = contentBuffer.indexOf(key);
  if (keyIndex === -1) return '';

  let i = keyIndex + key.length;
  while (i < contentBuffer.length && /[\s:]/.test(contentBuffer[i] ?? '')) {
    i += 1;
  }
  if (contentBuffer[i] !== '"') return '';

  i += 1;
  let result = '';
  while (i < contentBuffer.length) {
    const char = contentBuffer[i];
    if (char === '"') break;
    if (char === '\\' && i + 1 < contentBuffer.length) {
      const next = contentBuffer[i + 1];
      if (next === 'n') result += '\n';
      else if (next === 't') result += '\t';
      else if (next === '"') result += '"';
      else if (next === '\\') result += '\\';
      else result += next;
      i += 2;
      continue;
    }
    result += char;
    i += 1;
  }
  return result;
}

export type ChatStreamEvent =
  | { type: 'token'; data: string }
  | { type: 'final_action'; data: OrderAction[] }
  | { type: 'action'; data: AiOrderClientPayload }
  | { type: 'error'; data: string };

export async function* streamOrderIntent(
  chatRequest: ChatRequest
): AsyncGenerator<ChatStreamEvent> {
  const openai = getOpenAIClient();
  const { messages, allowedItemIds } = await prepareChatContext(chatRequest);

  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.1,
    messages,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'ai_order_response',
        strict: true,
        schema: AI_ORDER_RESPONSE_JSON_SCHEMA,
      },
    },
    stream: true,
  });

  let contentBuffer = '';
  let streamedResponseLength = 0;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;

    contentBuffer += delta;
    const partialResponse = parsePartialConversationalResponse(contentBuffer);
    if (partialResponse.length > streamedResponseLength) {
      const token = partialResponse.slice(streamedResponseLength);
      streamedResponseLength = partialResponse.length;
      yield { type: 'token', data: token };
    }
  }

  if (!contentBuffer) {
    yield { type: 'error', data: 'AI failed to return structured cart data.' };
    return;
  }

  let parsed;
  try {
    parsed = AiOrderResponseSchema.parse(JSON.parse(contentBuffer));
  } catch {
    yield { type: 'error', data: 'AI returned invalid cart data.' };
    return;
  }

  if (parsed.conversationalResponse.length > streamedResponseLength) {
    const remainder = parsed.conversationalResponse.slice(streamedResponseLength);
    if (remainder) {
      yield { type: 'token', data: remainder };
    }
  }

  const actions = filterActionsToRetrievedContext(
    parsed.actions,
    allowedItemIds,
    chatRequest.currentCart
  );
  logDroppedActions(parsed.actions, actions);

  yield { type: 'final_action', data: actions };

  yield {
    type: 'action',
    data: {
      conversationalResponse: parsed.conversationalResponse,
      actions,
      ui_action: parsed.ui_action ?? null,
    },
  };
}

export async function processOrderIntent(chatRequest: ChatRequest): Promise<AiOrderClientPayload> {
  for await (const event of streamOrderIntent(chatRequest)) {
    if (event.type === 'action') return event.data;
    if (event.type === 'error') throw new Error(event.data);
  }
  throw new Error('AI failed to return structured cart data.');
}
