import { z } from 'zod';

// 1. The Menu Item Schema
// This represents what is available in the Bistro.
export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.enum(['mains', 'sides', 'drinks', 'desserts']),
  modifiers: z.array(z.string()).optional(), // e.g., ["spicy", "decaf"]
});

export type MenuItem = z.infer<typeof MenuItemSchema>;

// 2. The AI Order Response Schema
// Enforced via OpenAI json_schema and validated with Zod at runtime.
const nullableItemId = z.preprocess(
  (value) => {
    if (value == null) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  },
  z.string().nullable()
);

export const OrderActionSchema = z.object({
  actionType: z.enum(['ADD', 'REMOVE', 'UPDATE_QUANTITY', 'NONE']),
  itemId: nullableItemId,
  quantity: z.number().nullable(),
});

export type OrderAction = z.infer<typeof OrderActionSchema>;

export const UiActionSchema = z.object({
  type: z.literal('change_language'),
  languageCode: z.string(),
});

export type UiAction = z.infer<typeof UiActionSchema>;

export const AiOrderResponseSchema = z.object({
  reasoning: z.string().min(1),
  conversationalResponse: z.string().min(1),
  actions: z.array(OrderActionSchema),
  ui_action: UiActionSchema.nullable(),
});

export type AiOrderResponse = z.infer<typeof AiOrderResponseSchema>;

export const AiOrderClientPayloadSchema = z.object({
  conversationalResponse: z.string().min(1),
  actions: z.array(OrderActionSchema),
  ui_action: UiActionSchema.nullable(),
});

export type AiOrderClientPayload = z.infer<typeof AiOrderClientPayloadSchema>;

// 3. Chat history message (from frontend)
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// 4. The API Request Body
// This is what the React Native app will send to the Node backend.
export const ChatRequestSchema = z
  .object({
    messages: z.array(ChatMessageSchema).min(1),
    currentCart: z.array(
      z.object({
        itemId: z.string(),
        quantity: z.number(),
        notes: z.string().optional(),
      })
    ),
  })
  .refine((body) => body.messages[body.messages.length - 1]?.role === 'user', {
    message: 'Last message must be from the user',
  });

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
