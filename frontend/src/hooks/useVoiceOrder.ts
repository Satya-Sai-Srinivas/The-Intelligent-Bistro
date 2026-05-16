import { useCallback, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { transcribeAudioFile } from '../services/transcribeAudio';

export type VoiceRecordingState = 'idle' | 'recording' | 'transcribing';

interface UseVoiceOrderOptions {
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
}

export function useVoiceOrder({ onTranscript, onError }: UseVoiceOrderOptions) {
  const [recordingState, setRecordingState] = useState<VoiceRecordingState>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const cancelledRef = useRef(false);

  const startRecording = useCallback(async () => {
    try {
      cancelledRef.current = false;
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        onError('Microphone permission is required for voice orders.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setRecordingState('recording');
    } catch (error) {
      console.error(error);
      onError('Could not start recording.');
      setRecordingState('idle');
    }
  }, [onError]);

  const discardRecording = useCallback(async () => {
    cancelledRef.current = true;
    const recording = recordingRef.current;
    recordingRef.current = null;

    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      } catch {
        // ignore cleanup errors
      }
    }

    setRecordingState('idle');
  }, []);

  const finishRecording = useCallback(async () => {
    if (cancelledRef.current) {
      setRecordingState('idle');
      return;
    }

    const recording = recordingRef.current;
    recordingRef.current = null;

    if (!recording) {
      setRecordingState('idle');
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        onError('Recording failed — no audio captured.');
        setRecordingState('idle');
        return;
      }

      setRecordingState('transcribing');
      const text = await transcribeAudioFile(uri);
      await FileSystem.deleteAsync(uri, { idempotent: true });

      if (!cancelledRef.current) {
        onTranscript(text);
      }
    } catch (error) {
      console.error(error);
      onError(error instanceof Error ? error.message : 'Transcription failed.');
    } finally {
      setRecordingState('idle');
    }
  }, [onTranscript, onError]);

  return {
    recordingState,
    startRecording,
    finishRecording,
    discardRecording,
    isRecording: recordingState === 'recording',
    isTranscribing: recordingState === 'transcribing',
  };
}
