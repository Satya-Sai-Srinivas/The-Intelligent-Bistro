import { API_BASE_URL } from '../config/api';

interface CreatePaymentIntentResponse {
  clientSecret: string;
}

interface ErrorResponse {
  error?: string;
}

export async function createPaymentIntent(
  amountCents: number,
  currency = 'usd'
): Promise<CreatePaymentIntentResponse> {
  const response = await fetch(`${API_BASE_URL}/create-payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountCents, currency }),
  });

  const data = (await response.json()) as CreatePaymentIntentResponse & ErrorResponse;

  if (!response.ok) {
    throw new Error(data.error ?? `Payment intent failed (${response.status})`);
  }

  if (!data.clientSecret) {
    throw new Error('Payment intent response missing client secret.');
  }

  return { clientSecret: data.clientSecret };
}
