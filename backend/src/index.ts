import './config/env';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { ChatRequestSchema, ChatRequest } from './types/schema';
import { streamOrderIntent, type ChatStreamEvent } from './services/ai.service';
import { transcribeAudioBuffer } from './services/transcription.service';

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
      'Access-Control-Allow-Origin': '*',
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
      const message = error instanceof Error ? error.message : 'Failed to process order intent.';
      writeSseEvent(raw, { type: 'error', data: message });
    }

    raw.end();
  }
);

server.post('/transcribe', async (request, reply) => {
  try {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ error: 'No audio file provided.' });
    }

    const audioBuffer = await file.toBuffer();
    if (audioBuffer.length === 0) {
      return reply.status(400).send({ error: 'Audio file is empty.' });
    }

    const text = await transcribeAudioBuffer(audioBuffer);

    return reply.send({ text });
  } catch (error) {
    server.log.error(error);
    const message = error instanceof Error ? error.message : 'Transcription failed.';
    const status = message.includes('ASSEMBLYAI_API_KEY') ? 503 : 500;
    return reply.status(status).send({ error: message });
  }
});

const start = async () => {
  try {
    await server.listen({
      port: process.env.PORT ? Number(process.env.PORT) : 3000,
      host: '0.0.0.0',
    });
    console.log(`🚀 Intelligent Bistro API is running on http://localhost:3000`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
