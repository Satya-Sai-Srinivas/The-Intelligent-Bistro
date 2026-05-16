import { API_BASE_URL } from '../config/api';

export async function transcribeAudioFile(uri: string): Promise<string> {
  const formData = new FormData();
  formData.append('audio', {
    uri,
    name: 'order.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'Could not transcribe your voice order.';
    try {
      const body = await response.json();
      if (body?.error) errorMessage = String(body.error);
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  const body = (await response.json()) as { text?: string };
  if (!body.text?.trim()) {
    throw new Error('No speech detected in the recording.');
  }

  return body.text.trim();
}
