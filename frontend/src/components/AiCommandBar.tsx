import React from 'react';
import { ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { View, Text, TextInput, TouchableOpacity } from './styled';
import { useAiThinkingPulse } from '../hooks/useAiThinkingPulse';
import { useRecordingPulse } from '../hooks/useRecordingPulse';
import { useCartStore } from '../store/useCartStore';
import type { VoiceRecordingState } from '../hooks/useVoiceOrder';

const useNativeBlur = Platform.OS === 'ios';

interface AiCommandBarProps {
  prompt: string;
  setPrompt: (text: string) => void;
  onSubmit: () => void;
  onCancelAi: () => void;
  recordingState: VoiceRecordingState;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording?: () => void;
}

export function AiCommandBar({
  prompt,
  setPrompt,
  onSubmit,
  onCancelAi,
  recordingState,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
}: AiCommandBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isAiThinking = useCartStore((state) => state.isAiThinking);
  const aiMessage = useCartStore((state) => state.aiMessage);
  const streamingMessage = useCartStore((state) => state.streamingMessage);
  const isAiActive = isAiThinking || Boolean(streamingMessage);
  const aiPulseStyle = useAiThinkingPulse(isAiActive && recordingState !== 'recording');
  const isRecording = recordingState === 'recording';
  const recordingPulseStyle = useRecordingPulse(isRecording);
  const isTranscribing = recordingState === 'transcribing';
  const isBusy = isAiThinking || isTranscribing;

  const displayMessage =
    isAiThinking && streamingMessage ? streamingMessage : aiMessage;

  const handleMicPress = () => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  const shellContent = (
    <>
      {displayMessage ? (
        <View className="bg-white/50 p-3 rounded-2xl mb-3 min-h-[48px] max-h-[96px] overflow-hidden border border-white/60">
          <Text className="text-bistro-dark text-sm italic">
            &ldquo;{displayMessage}
            {isAiThinking ? <Text className="text-bistro-gold">|</Text> : null}&rdquo;
          </Text>
        </View>
      ) : null}

      {isTranscribing ? (
        <View className="flex-row items-center justify-center py-4">
          <ActivityIndicator color="#D4AF37" />
          <Text className="text-bistro-dark font-medium ml-3">{t('ai.transcribing')}</Text>
        </View>
      ) : (
        <View className="flex-row items-center">
          <Animated.View style={isRecording ? recordingPulseStyle : undefined}>
            <TouchableOpacity
              onPress={handleMicPress}
              disabled={isBusy}
              accessibilityLabel={isRecording ? t('ai.stopRecording') : t('ai.startVoiceOrder')}
              className={`mr-2 p-4 rounded-xl items-center justify-center ${
                isRecording ? 'bg-red-500' : isBusy ? 'bg-gray-200' : 'bg-bistro-gold'
              }`}
              activeOpacity={0.85}
            >
              {isRecording ? (
                <Feather name="square" size={18} color="#FFFFFF" />
              ) : (
                <Feather
                  name="mic"
                  size={22}
                  color={isBusy ? '#9CA3AF' : '#1A1A1A'}
                />
              )}
            </TouchableOpacity>
          </Animated.View>

          {isRecording && onCancelRecording ? (
            <TouchableOpacity
              onPress={onCancelRecording}
              className="mr-2 px-2 py-1"
              activeOpacity={0.8}
            >
              <Text className="text-red-600 text-sm font-semibold">{t('ai.cancel')}</Text>
            </TouchableOpacity>
          ) : null}

          <TextInput
            className="flex-1 bg-white/50 p-4 rounded-xl text-base text-bistro-dark border border-white/60"
            placeholder={
              isRecording
                ? t('ai.listening')
                : t('ai.placeholder', 'Search the menu or ask the AI...')
            }
            placeholderTextColor="#9CA3AF"
            value={prompt}
            onChangeText={setPrompt}
            onSubmitEditing={onSubmit}
            editable={!isBusy && !isRecording}
          />
          {isAiThinking ? (
            <TouchableOpacity
              className="ml-3 p-4 rounded-xl items-center justify-center bg-red-500"
              onPress={onCancelAi}
              accessibilityLabel={t('ai.cancel')}
              activeOpacity={0.85}
            >
              <Feather name="x" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className={`ml-3 p-4 rounded-xl items-center justify-center ${
                isBusy || isRecording ? 'bg-gray-400' : 'bg-bistro-dark'
              }`}
              onPress={onSubmit}
              disabled={isBusy || isRecording}
            >
              <Text className="text-white font-bold">{t('ai.order')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );

  return (
    <View
      style={[
        styles.footerContainer,
        { paddingBottom: insets.bottom + 12 },
      ]}
    >
      <Animated.View
        style={[
          aiPulseStyle,
          styles.outerShell,
          isAiActive && recordingState !== 'recording' && styles.outerShellActive,
        ]}
      >
        {useNativeBlur ? (
          <BlurView intensity={80} tint="light" style={styles.glassShell}>
            <View className="bg-white/25 px-4 pt-4 pb-3">{shellContent}</View>
          </BlurView>
        ) : (
          <View className="rounded-3xl overflow-hidden border border-white/50 bg-white/70">
            <View className="px-4 pt-4 pb-3">{shellContent}</View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  glassShell: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  outerShell: {
    borderRadius: 24,
    borderWidth: 0,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  outerShellActive: {
    borderWidth: 2,
    shadowColor: '#D4AF37',
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
});
