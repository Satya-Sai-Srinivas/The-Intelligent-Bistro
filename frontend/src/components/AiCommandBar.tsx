import React from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView } from './styled';
import { useAiThinkingPulse } from '../hooks/useAiThinkingPulse';
import type { VoiceRecordingState } from '../hooks/useVoiceOrder';

interface AiCommandBarProps {
  prompt: string;
  setPrompt: (text: string) => void;
  onSubmit: () => void;
  isAiThinking: boolean;
  aiMessage: string | null;
  streamingMessage: string;
  recordingState: VoiceRecordingState;
  onMicPressIn: () => void;
  onMicPressOut: () => void;
  onCancelRecording: () => void;
}

export function AiCommandBar({
  prompt,
  setPrompt,
  onSubmit,
  isAiThinking,
  aiMessage,
  streamingMessage,
  recordingState,
  onMicPressIn,
  onMicPressOut,
  onCancelRecording,
}: AiCommandBarProps) {
  const pulseStyle = useAiThinkingPulse(isAiThinking);
  const isRecording = recordingState === 'recording';
  const isTranscribing = recordingState === 'transcribing';
  const isBusy = isAiThinking || isRecording || isTranscribing;

  const displayMessage =
    isAiThinking && streamingMessage
      ? streamingMessage
      : aiMessage;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="absolute bottom-0 w-full px-4 pb-8 pt-4"
    >
      <Animated.View
        style={[
          pulseStyle,
          {
            borderWidth: isAiThinking ? 2 : 0,
            borderRadius: 16,
            shadowColor: '#D4AF37',
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 12,
            shadowOpacity: isAiThinking ? 0.6 : 0,
          },
        ]}
      >
        <View className="bg-white border-t border-gray-200 shadow-lg rounded-2xl px-4 pt-4 pb-2">
          {displayMessage ? (
            <View className="bg-blue-50 p-3 rounded-lg mb-3 min-h-[48px]">
              <Text className="text-blue-800 text-sm italic">
                &ldquo;{displayMessage}
                {isAiThinking ? <Text className="text-bistro-gold">|</Text> : null}&rdquo;
              </Text>
            </View>
          ) : null}

          {isRecording ? (
            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center flex-1">
                <View className="w-3 h-3 rounded-full bg-red-500 mr-3" />
                <Text className="text-base font-semibold text-bistro-dark">
                  Recording...
                </Text>
              </View>
              <TouchableOpacity
                onPress={onCancelRecording}
                className="flex-row items-center bg-red-50 border border-red-200 px-4 py-3 rounded-xl"
                activeOpacity={0.8}
              >
                <Text className="text-red-600 font-bold mr-1">🗑</Text>
                <Text className="text-red-600 font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : isTranscribing ? (
            <View className="flex-row items-center justify-center py-4">
              <ActivityIndicator color="#D4AF37" />
              <Text className="text-bistro-dark font-medium ml-3">
                Transcribing your order...
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <TouchableOpacity
                onPressIn={onMicPressIn}
                onPressOut={onMicPressOut}
                disabled={isBusy}
                className={`mr-2 p-4 rounded-xl items-center justify-center ${
                  isBusy ? 'bg-gray-200' : 'bg-bistro-gold'
                }`}
                activeOpacity={0.85}
              >
                <Text className="text-lg">🎤</Text>
              </TouchableOpacity>

              <TextInput
                className="flex-1 bg-gray-100 p-4 rounded-xl text-base text-bistro-dark"
                placeholder="e.g. Add a burger and truffle fries..."
                placeholderTextColor="#9CA3AF"
                value={prompt}
                onChangeText={setPrompt}
                onSubmitEditing={onSubmit}
                editable={!isBusy}
              />
              <TouchableOpacity
                className={`ml-3 p-4 rounded-xl items-center justify-center ${
                  isBusy ? 'bg-gray-400' : 'bg-bistro-dark'
                }`}
                onPress={onSubmit}
                disabled={isBusy}
              >
                {isAiThinking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold">Order</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
