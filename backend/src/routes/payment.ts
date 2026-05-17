import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Add it to backend/.env (see .env.example).`);
  }
  return value;
}

const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));

const CreatePaymentIntentSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().min(3).max(3),
});

export type CreatePaymentIntentBody = z.infer<typeof CreatePaymentIntentSchema>;

export async function paymentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/create-payment-intent',
    {
      schema: {
        body: CreatePaymentIntentSchema,
      },
    },
    async (request, reply) => {
      const { amount, currency } = request.body as CreatePaymentIntentBody;

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: currency.toLowerCase(),
          automatic_payment_methods: { enabled: true },
        });

        if (!paymentIntent.client_secret) {
          return reply.status(400).send({ error: 'Payment intent missing client secret.' });
        }

        return { clientSecret: paymentIntent.client_secret };
      } catch (error) {
        fastify.log.error(error);
        const message =
          error instanceof Error ? error.message : 'Failed to create payment intent.';
        return reply.status(500).send({ error: message });
      }
    }
  );
}
