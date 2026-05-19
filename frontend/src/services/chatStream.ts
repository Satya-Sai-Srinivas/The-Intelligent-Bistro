import EventSource, { type EventSourceEvent } from 'react-native-sse';
import { API_BASE_URL } from '../config/api';
import type { ChatMessage } from '../types/chat';
import type { AiOrderPayload, OrderAction } from '../types/cart';
import { applyUiAction } from '../utils/applyUiAction';

export type BistroSseEvents = 'token' | 'final_action' | 'action' | 'error';

export interface CartItemPayload {
  itemId: string;
  quantity: number;
  notes?: string;
}

export interface StreamChatCallbacks {
  onToken: (token: string) => void;
  /** Cart mutations from dedicated SSE event (actions array only). */
  onFinalActions: (actions: OrderAction[]) => void;
  /** Assistant reply and chat history after stream completes. */
  onAssistantComplete: (payload: AiOrderPayload) => void;
  onError: (message: string) => void;
}

function parseJsonData(data: string | null): unknown {
  if (!data) return null;
  return JSON.parse(data);
}

function normalizeCartForApi(cart: CartItemPayload[]): CartItemPayload[] {
  return cart.map((item) => ({
    ...item,
    itemId: String(item.itemId),
  }));
}

function parseHttpErrorMessage(rawBody: string): string | null {
  try {
    const body = JSON.parse(rawBody) as {
      error?: string;
      message?: string | string[];
    };
    if (typeof body.message === 'string' && body.message.length > 0) {
      return body.message;
    }
    if (Array.isArray(body.message) && body.message.length > 0) {
      return body.message.join(', ');
    }
    if (body.error && body.error !== 'Bad Request') {
      return body.error;
    }
    if (body.error) {
      return body.message
        ? Array.isArray(body.message)
          ? body.message.join(', ')
          : String(body.message)
        : body.error;
    }
  } catch {
    if (rawBody.length > 0 && rawBody.length < 200) {
      return rawBody;
    }
  }
  return null;
}

function isXhrError(
  event: EventSourceEvent<BistroSseEvents>
): event is EventSourceEvent<BistroSseEvents> & {
  message: string;
  xhrStatus: number;
} {
  return event.type === 'error' && 'xhrStatus' in event;
}

/**
 * Streams AI chat over SSE using react-native-sse (XHR-based).
 * Hermes does not support fetch ReadableStream, so EventSource is required on device.
 */
export function streamChatOrder(
  messages: ChatMessage[],
  currentCart: CartItemPayload[],
  callbacks: StreamChatCallbacks
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let receivedTerminalEvent = false;

    const es = new EventSource<BistroSseEvents>(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ messages, currentCart: normalizeCartForApi(currentCart) }),
      pollingInterval: 0,
    });

    const finish = () => {
      if (settled) return;
      settled = true;
      es.removeAllEventListeners();
      es.close();
      resolve();
    };

    es.addEventListener('token', (event) => {
      if (event.type !== 'token' || !event.data) return;
      try {
        const token = parseJsonData(event.data);
        if (typeof token === 'string' && token.length > 0) {
          callbacks.onToken(token);
        }
      } catch {
        // ignore malformed token chunks
      }
    });

    es.addEventListener('final_action', (event) => {
      if (event.type !== 'final_action' || !event.data) return;
      try {
        const parsed = parseJsonData(event.data);
        if (!Array.isArray(parsed)) {
          callbacks.onError('AI returned invalid cart actions.');
          return;
        }
        callbacks.onFinalActions(parsed as OrderAction[]);
      } catch {
        callbacks.onError('AI returned invalid cart data.');
      }
    });

    es.addEventListener('action', (event) => {
      if (event.type !== 'action' || !event.data) return;
      receivedTerminalEvent = true;
      try {
        const payload = parseJsonData(event.data) as AiOrderPayload;
        applyUiAction(payload.ui_action);
        callbacks.onAssistantComplete(payload);
      } catch {
        callbacks.onError('AI returned invalid cart data.');
      }
      finish();
    });

    es.addEventListener('error', (event) => {
      if (settled) return;

      // Server-sent `event: error` (custom SSE event — has `data`, not xhrStatus)
      if (
        event.type === 'error' &&
        !('xhrStatus' in event) &&
        'data' in event &&
        typeof (event as { data?: string | null }).data === 'string'
      ) {
        receivedTerminalEvent = true;
        try {
          const data = parseJsonData((event as { data: string }).data);
          callbacks.onError(typeof data === 'string' ? data : 'Something went wrong.');
        } catch {
          callbacks.onError('Something went wrong.');
        }
        finish();
        return;
      }

      if (event.type === 'timeout') {
        callbacks.onError('The request timed out. Please try again.');
        finish();
        return;
      }

      if (event.type === 'exception') {
        callbacks.onError(event.message || 'Something went wrong.');
        finish();
        return;
      }

      if (isXhrError(event)) {
        let errorMessage = 'Sorry, the kitchen is a bit overwhelmed right now.';
        if (event.xhrStatus >= 400 && event.message) {
          const parsed = parseHttpErrorMessage(event.message);
          if (parsed) {
            errorMessage = parsed;
          }
        }
        callbacks.onError(errorMessage);
        finish();
      }
    });

    es.addEventListener('close', () => {
      if (!receivedTerminalEvent && !settled) {
        callbacks.onError('Connection closed unexpectedly.');
      }
      finish();
    });
  });
}
