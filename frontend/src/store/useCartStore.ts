import { create } from 'zustand';
import { getMenuItemPrice } from '../constants/menu';
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

export const selectItemQuantity =
  (itemId: string) => (state: CartState) =>
    state.items.find((i) => i.itemId === itemId)?.quantity ?? 0;

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isAiThinking: false,
  aiMessage: null,
  streamingMessage: '',

  addItem: (newItem) =>
    set((state) => {
      const normalizedItem = { ...newItem, itemId: String(newItem.itemId) };
      const existingItem = state.items.find((i) => i.itemId === normalizedItem.itemId);
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.itemId === normalizedItem.itemId
              ? {
                  ...i,
                  quantity: i.quantity + normalizedItem.quantity,
                  notes: normalizedItem.notes || i.notes,
                }
              : i
          ),
        };
      }
      return { items: [...state.items, normalizedItem] };
    }),

  removeItem: (itemId) =>
    set((state) => ({
      items: state.items.filter((i) => i.itemId !== String(itemId)),
    })),

  updateQuantity: (itemId, quantity) =>
    set((state) => {
      const id = String(itemId);
      return {
        items:
          quantity > 0
            ? state.items.map((i) => (i.itemId === id ? { ...i, quantity } : i))
            : state.items.filter((i) => i.itemId !== id),
      };
    }),

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
    const { items, addItem, removeItem, updateQuantity } = get();

    for (const action of payload.actions) {
      if (action.actionType === 'NONE' || !action.itemId) continue;

      const itemId = String(action.itemId).trim();
      if (!itemId) continue;

      const inCart = items.some((item) => item.itemId === itemId);

      switch (action.actionType) {
        case 'ADD': {
          const price = getMenuItemPrice(itemId);
          if (price == null) continue;

          const quantity = action.quantity ?? 1;
          if (quantity < 1) continue;

          addItem({ itemId, quantity, price });
          break;
        }
        case 'REMOVE':
          if (!inCart) continue;
          removeItem(itemId);
          break;
        case 'UPDATE_QUANTITY':
          if (!inCart || action.quantity == null || action.quantity < 0) continue;
          updateQuantity(itemId, action.quantity);
          break;
      }
    }
  },
}));
