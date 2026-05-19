import { AssemblyAI } from 'assemblyai';
import '../config/env';

const ASSEMBLYAI_SPEECH_MODELS = ['universal-3-pro', 'universal-2'] as const;

let assemblyClient: AssemblyAI | null = null;

function getAssemblyClient(): AssemblyAI {
  const apiKey = process.env.ASSEMBLYAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'ASSEMBLYAI_API_KEY is not set. Copy backend/.env.example to backend/.env and add your key.'
    );
  }

  if (!assemblyClient) {
    assemblyClient = new AssemblyAI({ apiKey });
  }

  return assemblyClient;
}

export async function transcribeAudioBuffer(audioBuffer: Buffer): Promise<string> {
  const client = getAssemblyClient();

  const transcript = await client.transcripts.transcribe({
    audio: audioBuffer,
    speech_models: [...ASSEMBLYAI_SPEECH_MODELS],
    language_detection: true,
    // AssemblyAI infers format from bytes; m4a from Expo is supported
  });

  if (transcript.status === 'error') {
    throw new Error(transcript.error ?? 'Transcription failed.');
  }

  const text = transcript.text?.trim();
  if (!text) {
    throw new Error('No speech detected in the recording.');
  }

  return text;
}
