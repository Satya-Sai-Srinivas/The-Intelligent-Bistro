import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView } from './src/components/styled';
import { useCartStore } from './src/store/useCartStore';
import { MENU_ITEMS } from './src/constants/menu';
import { streamChatOrder } from './src/services/chatStream';
import type { ChatMessage } from './src/types/chat';
import { CartBadge } from './src/components/CartBadge';
import { CartModal } from './src/components/CartModal';
import { AiCommandBar } from './src/components/AiCommandBar';
import { useVoiceOrder } from './src/hooks/useVoiceOrder';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const {
    items,
    isAiThinking,
    aiMessage,
    streamingMessage,
    setAiStatus,
    appendStreamingMessage,
    resetStreamingMessage,
    processAiActions,
  } = useCartStore();

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const submitOrder = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || isAiThinking) return;

      const outbound: ChatMessage[] = [...chatMessages, { role: 'user', content: trimmed }];

      setAiStatus(true, null);
      resetStreamingMessage();
      setChatMessages(outbound);

      await streamChatOrder(outbound, items, {
        onToken: (token) => appendStreamingMessage(token),
        onFinalActions: (actions) => {
          processAiActions({ actions, conversationalResponse: '' });
        },
        onAssistantComplete: (payload) => {
          setAiStatus(false, payload.conversationalResponse);
          resetStreamingMessage();
          setChatMessages([
            ...outbound,
            { role: 'assistant', content: payload.conversationalResponse },
          ]);
        },
        onError: (errorMessage) => {
          setAiStatus(false, errorMessage);
          resetStreamingMessage();
        },
      });
    },
    [
      chatMessages,
      items,
      isAiThinking,
      setAiStatus,
      resetStreamingMessage,
      appendStreamingMessage,
      processAiActions,
    ]
  );

  const handleAiSubmit = useCallback(async () => {
    if (!prompt.trim()) return;
    const userMessage = prompt;
    setPrompt('');
    await submitOrder(userMessage);
  }, [prompt, submitOrder]);

  const handleVoiceTranscript = useCallback(
    async (text: string) => {
      setPrompt(text);
      await submitOrder(text);
    },
    [submitOrder]
  );

  const handleVoiceError = useCallback(
    (message: string) => {
      setAiStatus(false, message);
    },
    [setAiStatus]
  );

  const {
    recordingState,
    startRecording,
    finishRecording,
    discardRecording,
  } = useVoiceOrder({
    onTranscript: handleVoiceTranscript,
    onError: handleVoiceError,
  });

  return (
    <SafeAreaView className="flex-1 bg-bistro-light">
      <View className="px-6 py-4 flex-row justify-between items-center bg-white border-b border-gray-200">
        <Text className="text-2xl font-bold text-bistro-dark">The Bistro</Text>
        <CartBadge cartCount={cartCount} onPress={() => setCartOpen(true)} />
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {MENU_ITEMS.map((item) => (
          <View key={item.id} className="bg-white p-4 rounded-xl mb-4 shadow-sm border border-gray-100">
            <View className="flex-row justify-between">
              <Text className="text-lg font-bold text-bistro-dark">{item.name}</Text>
              <Text className="text-lg font-bold text-bistro-gold">${item.price.toFixed(2)}</Text>
            </View>
            <Text className="text-gray-500 mt-1">{item.description}</Text>
          </View>
        ))}
        <View className="h-32" />
      </ScrollView>

      <AiCommandBar
        prompt={prompt}
        setPrompt={setPrompt}
        onSubmit={handleAiSubmit}
        isAiThinking={isAiThinking}
        aiMessage={aiMessage}
        streamingMessage={streamingMessage}
        recordingState={recordingState}
        onMicPressIn={startRecording}
        onMicPressOut={finishRecording}
        onCancelRecording={discardRecording}
      />

      <CartModal visible={cartOpen} onClose={() => setCartOpen(false)} />
    </SafeAreaView>
  );
}
