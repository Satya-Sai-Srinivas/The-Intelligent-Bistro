export type OrderActionType = 'ADD' | 'REMOVE' | 'UPDATE_QUANTITY' | 'NONE';

export interface OrderAction {
  actionType: OrderActionType;
  itemName: string | null;
  quantity: number | null;
}

export interface AiOrderPayload {
  conversationalResponse: string;
  actions: OrderAction[];
}
