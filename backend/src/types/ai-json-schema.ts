/**
 * OpenAI strict JSON Schema for structured cart reasoning output.
 * Kept in sync with Zod schemas in schema.ts.
 */
export const AI_ORDER_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    reasoning: {
      type: 'string',
      description:
        'Internal monologue: include the exact line "Did the user explicitly confirm this item? Yes/No." then plan menu matches, cart deltas, dietary checks, and actions. Use empty actions if No.',
    },
    conversationalResponse: {
      type: 'string',
      description: 'Polite, user-facing reply (e.g. "I\'ve added the burgers and fries to your cart!").',
    },
    actions: {
      type: 'array',
      description:
        'Cart mutations to apply. Use multiple entries for compound requests. Use an empty array when the request is ambiguous and clarification is needed.',
      items: {
        type: 'object',
        properties: {
          actionType: {
            type: 'string',
            enum: ['ADD', 'REMOVE', 'UPDATE_QUANTITY', 'NONE'],
            description: 'Cart operation to perform.',
          },
          itemId: {
            type: ['string', 'null'],
            description:
              'The exact ID of the menu item from the retrieved context. Null when not applicable.',
          },
          quantity: {
            type: ['number', 'null'],
            description: 'Item count for ADD/UPDATE_QUANTITY. Null when not applicable.',
          },
        },
        required: ['actionType', 'itemId', 'quantity'],
        additionalProperties: false,
      },
    },
    ui_action: {
      type: ['object', 'null'],
      description:
        'Optional UI directive. Set when the user speaks a foreign language or requests a language change.',
      properties: {
        type: {
          type: 'string',
          enum: ['change_language'],
          description: 'UI action type.',
        },
        languageCode: {
          type: 'string',
          description:
            'ISO 639-1 language code: en, fr, de, zh, te, es, hi, kn, ta, ml.',
        },
      },
      required: ['type', 'languageCode'],
      additionalProperties: false,
    },
  },
  required: ['reasoning', 'conversationalResponse', 'actions', 'ui_action'],
  additionalProperties: false,
} as const;
