import { create } from 'zustand';
import { getMenuItemPrice, resolveMenuItemId } from '../constants/menu';
import type { AiOrderPayload } from '../types/cart';

export interface CartItem {
  itemId: string;
  quantity: number;
  notes?: string;
  price: number;
}

interface CartState {
  items: CartItem[];
  isAiThinking: boolean;
  aiMessage: string | null;
  streamingMessage: string;

  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;

  setAiStatus: (isThinking: boolean, message?: string | null) => void;
  appendStreamingMessage: (token: string) => void;
  resetStreamingMessage: () => void;
  processAiActions: (payload: AiOrderPayload) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isAiThinking: false,
  aiMessage: null,
  streamingMessage: '',

  addItem: (newItem) =>
    set((state) => {
      const existingItem = state.items.find((i) => i.itemId === newItem.itemId);
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.itemId === newItem.itemId
              ? {
                  ...i,
                  quantity: i.quantity + newItem.quantity,
                  notes: newItem.notes || i.notes,
                }
              : i
          ),
        };
      }
      return { items: [...state.items, newItem] };
    }),

  removeItem: (itemId) =>
    set((state) => ({
      items: state.items.filter((i) => i.itemId !== itemId),
    })),

  updateQuantity: (itemId, quantity) =>
    set((state) => ({
      items:
        quantity > 0
          ? state.items.map((i) => (i.itemId === itemId ? { ...i, quantity } : i))
          : state.items.filter((i) => i.itemId !== itemId),
    })),

  clearCart: () => set({ items: [] }),

  setAiStatus: (isThinking, message = null) =>
    set({
      isAiThinking: isThinking,
      aiMessage: message,
    }),

  appendStreamingMessage: (token) =>
    set((state) => ({
      streamingMessage: state.streamingMessage + token,
    })),

  resetStreamingMessage: () => set({ streamingMessage: '' }),

  processAiActions: (payload) => {
    const { addItem, removeItem, updateQuantity } = get();

    for (const action of payload.actions) {
      if (action.actionType === 'NONE' || !action.itemName) continue;

      const resolved = resolveMenuItemId(action.itemName);
      const itemId = resolved ?? action.itemName.trim();
      if (!itemId) continue;

      switch (action.actionType) {
        case 'ADD':
          addItem({
            itemId,
            quantity: action.quantity ?? 1,
            price: getMenuItemPrice(itemId),
          });
          break;
        case 'REMOVE':
          removeItem(itemId);
          break;
        case 'UPDATE_QUANTITY':
          if (action.quantity != null) {
            updateQuantity(itemId, action.quantity);
          }
          break;
      }
    }
  },
}));
