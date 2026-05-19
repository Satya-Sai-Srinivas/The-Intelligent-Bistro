import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { StripeProvider } from './src/lib/stripe';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, SafeAreaView } from './src/components/styled';
import { useCartStore } from './src/store/useCartStore';
import { streamChatOrder } from './src/services/chatStream';
import type { ChatMessage } from './src/types/chat';
import { CartBadge } from './src/components/CartBadge';
import { LanguageSelector } from './src/components/LanguageSelector';
import { CartModal } from './src/components/CartModal';
import { AiCommandBar } from './src/components/AiCommandBar';
import { MenuList } from './src/components/MenuList';
import { ResponsiveShell } from './src/components/ResponsiveShell';
import { useVoiceOrder } from './src/hooks/useVoiceOrder';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
const STRIPE_MERCHANT_ID = 'merchant.com.theintelligentbistro';

function BistroApp() {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const cartCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  const submitOrder = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      const isAiThinking = useCartStore.getState().isAiThinking;
      if (!trimmed || isAiThinking) return;

      const outbound: ChatMessage[] = [...chatMessages, { role: 'user', content: trimmed }];

      const {
        setAiStatus,
        resetStreamingMessage,
        appendStreamingMessage,
        processAiActions,
      } = useCartStore.getState();

      setAiStatus(true, null);
      resetStreamingMessage();
      setChatMessages(outbound);

      const cartItems = useCartStore.getState().items;

      await streamChatOrder(outbound, cartItems, {
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
    [chatMessages]
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

  const handleVoiceLocalError = useCallback((message: string) => {
    const { setAiStatus, resetStreamingMessage } = useCartStore.getState();
    setAiStatus(false, null);
    resetStreamingMessage();
    Alert.alert(t('common.error'), message);
  }, [t]);

  const {
    recordingState,
    startRecording,
    stopRecording,
    discardRecording,
  } = useVoiceOrder({
    onTranscript: handleVoiceTranscript,
    onLocalError: handleVoiceLocalError,
  });

  return (
    <SafeAreaView className="flex-1 items-center">
      <LinearGradient
        colors={['#FAF8F5', '#F5F0E6', '#ECEAE8']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardRoot}
      >
        <ResponsiveShell>
          <View className="px-6 py-4 flex-row justify-between items-center bg-white/30 border-b border-white/40">
            <Text className="text-2xl font-bold text-bistro-dark">{t('header.title')}</Text>
            <View className="flex-row items-center gap-3">
              <LanguageSelector />
              <CartBadge cartCount={cartCount} onPress={() => setCartOpen(true)} />
            </View>
          </View>

          <MenuList searchQuery={prompt} />

          <AiCommandBar
            prompt={prompt}
            setPrompt={setPrompt}
            onSubmit={handleAiSubmit}
            recordingState={recordingState}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onCancelRecording={discardRecording}
          />

          <CartModal visible={cartOpen} onClose={() => setCartOpen(false)} />
        </ResponsiveShell>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    width: '100%',
  },
});

export default function App() {
  if (!STRIPE_PUBLISHABLE_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY. Add it to frontend/.env (see .env.example).'
    );
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier={STRIPE_MERCHANT_ID}
    >
      <SafeAreaProvider>
        <BistroApp />
      </SafeAreaProvider>
    </StripeProvider>
  );
}
