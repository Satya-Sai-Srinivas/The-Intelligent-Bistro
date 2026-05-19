export type OrderActionType = 'ADD' | 'REMOVE' | 'UPDATE_QUANTITY' | 'NONE';

export interface OrderAction {
  actionType: OrderActionType;
  itemId: string | null;
  quantity: number | null;
}

export interface UiAction {
  type: 'change_language';
  languageCode: string;
}

export interface AiOrderPayload {
  conversationalResponse: string;
  actions: OrderAction[];
  ui_action?: UiAction | null;
}
