import { useCallback, useRef, useState } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { transcribeAudioFile } from '../services/transcribeAudio';
import { deleteRecordingFile } from '../utils/deleteRecordingFile';

export type VoiceRecordingState = 'idle' | 'recording' | 'transcribing';

interface UseVoiceOrderOptions {
  onTranscript: (text: string) => void;
  onLocalError: (message: string) => void;
}

export function useVoiceOrder({ onTranscript, onLocalError }: UseVoiceOrderOptions) {
  const [recordingState, setRecordingState] = useState<VoiceRecordingState>('idle');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const cancelledRef = useRef(false);

  const startRecording = useCallback(async () => {
    try {
      cancelledRef.current = false;
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        onLocalError('Microphone permission is required for voice orders.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingState('recording');
    } catch (error) {
      console.error(error);
      onLocalError('Could not start recording.');
      setRecordingState('idle');
    }
  }, [onLocalError, recorder]);

  const discardRecording = useCallback(async () => {
    cancelledRef.current = true;

    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
      const uri = recorder.uri;
      if (uri) {
        deleteRecordingFile(uri);
      }
    } catch {
      // ignore recorder stop errors during cancel
    }

    setRecordingState('idle');
  }, [recorder]);

  const finishRecording = useCallback(async () => {
    if (cancelledRef.current) {
      setRecordingState('idle');
      return;
    }

    if (!recorder.isRecording) {
      setRecordingState('idle');
      return;
    }

    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) {
        onLocalError('Recording failed — no audio captured.');
        setRecordingState('idle');
        return;
      }

      setRecordingState('transcribing');
      const text = await transcribeAudioFile(uri);
      deleteRecordingFile(uri);

      if (!cancelledRef.current) {
        onTranscript(text);
      }
    } catch (error) {
      console.error(error);
      onLocalError(
        error instanceof Error ? error.message : 'Transcription failed.'
      );
    } finally {
      setRecordingState('idle');
    }
  }, [onTranscript, onLocalError, recorder]);

  return {
    recordingState,
    startRecording,
    stopRecording: finishRecording,
    finishRecording,
    discardRecording,
    isRecording: recordingState === 'recording',
    isTranscribing: recordingState === 'transcribing',
  };
}
