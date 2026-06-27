import './config/env';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { ChatRequestSchema, ChatRequest } from './types/schema';
import { streamOrderIntent, type ChatStreamEvent } from './services/ai.service';
import { transcribeAudioBuffer } from './services/transcription.service';
import { paymentRoutes } from './routes/payment';

const server = Fastify({
  logger: true,
}).withTypeProvider<ZodTypeProvider>();

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(cors, {
  origin: '*',
});

server.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

server.get('/health', async () => {
  return { status: 'online', bistro: 'ready for orders' };
});

function writeSseEvent(
  raw: NodeJS.WritableStream,
  event: ChatStreamEvent
): void {
  raw.write(`event: ${event.type}\n`);
  raw.write(`data: ${JSON.stringify(event.data)}\n\n`);
}

server.post(
  '/chat',
  {
    schema: {
      body: ChatRequestSchema,
    },
  },
  async (request, reply) => {
    const chatRequest = request.body as ChatRequest;

    reply.hijack();
    const raw = reply.raw;

    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    try {
      for await (const event of streamOrderIntent(chatRequest)) {
        writeSseEvent(raw, event);
        if (event.type === 'action' || event.type === 'error') {
          break;
        }
      }
    } catch (error) {
      server.log.error(error);
      writeSseEvent(raw, { type: 'error', data: 'Failed to process your order. Please try again.' });
    }

    raw.end();
  }
);

const ALLOWED_AUDIO_MIMES = new Set([
  'audio/m4a',
  'audio/x-m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'video/webm', // some browsers report webm audio as video/webm
]);

server.post('/transcribe', async (request, reply) => {
  try {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ error: 'No audio file provided.' });
    }

    if (!ALLOWED_AUDIO_MIMES.has(file.mimetype)) {
      return reply.status(400).send({ error: 'Only audio files are accepted.' });
    }

    const audioBuffer = await file.toBuffer();
    if (audioBuffer.length === 0) {
      return reply.status(400).send({ error: 'Audio file is empty.' });
    }

    const text = await transcribeAudioBuffer(audioBuffer);

    return reply.send({ text });
  } catch (error) {
    server.log.error(error);
    const isKeyMissing = error instanceof Error && error.message.includes('ASSEMBLYAI_API_KEY');
    const status = isKeyMissing ? 503 : 500;
    const clientMessage = isKeyMissing
      ? 'The transcription service is temporarily unavailable.'
      : 'Transcription failed. Please try again.';
    return reply.status(status).send({ error: clientMessage });
  }
});

const start = async () => {
  try {
    await server.register(paymentRoutes);

    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    await server.listen({
      port,
      host: '0.0.0.0',
    });
    console.log(`🚀 Intelligent Bistro API is running on http://0.0.0.0:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
