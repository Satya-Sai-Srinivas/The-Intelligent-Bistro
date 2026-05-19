import { ZodError } from 'zod';
import { AiOrderResponseSchema } from '../../types/schema';

const validPayload = {
  reasoning: 'Did the user explicitly confirm this item? Yes.',
  conversationalResponse: 'Added to your cart.',
  actions: [{ actionType: 'ADD' as const, itemId: '1049', quantity: 1 }],
  ui_action: null,
};

describe('AiOrderResponseSchema', () => {
  it('parses a valid AI order response payload', () => {
    const result = AiOrderResponseSchema.parse(validPayload);

    expect(result.reasoning).toBe(validPayload.reasoning);
    expect(result.conversationalResponse).toBe(validPayload.conversationalResponse);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]?.actionType).toBe('ADD');
    expect(result.actions[0]?.itemId).toBe('1049');
    expect(result.ui_action).toBeNull();
  });

  it('throws when reasoning is missing', () => {
    expect(() =>
      AiOrderResponseSchema.parse({
        conversationalResponse: 'Hi',
        actions: [],
        ui_action: null,
      })
    ).toThrow(ZodError);
  });

  it('throws when reasoning is empty', () => {
    expect(() =>
      AiOrderResponseSchema.parse({
        ...validPayload,
        reasoning: '',
      })
    ).toThrow(ZodError);
  });

  it('coerces numeric itemId to string', () => {
    const result = AiOrderResponseSchema.parse({
      ...validPayload,
      actions: [{ actionType: 'ADD', itemId: 1049, quantity: 1 }],
    });

    expect(result.actions[0]?.itemId).toBe('1049');
  });
});
