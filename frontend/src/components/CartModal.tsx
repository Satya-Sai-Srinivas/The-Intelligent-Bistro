import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useStripe } from '../lib/stripe';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { View, Text, TouchableOpacity, ScrollView } from './styled';
import { useMenuItems } from '../hooks/useMenuItems';
import { useCartStore } from '../store/useCartStore';
import { createPaymentIntent } from '../services/payment';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

interface CartModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CartModal({ visible, onClose }: CartModalProps) {
  const { items: menuItems } = useMenuItems();
  const { t, i18n } = useTranslation();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const translateY = useSharedValue(SHEET_HEIGHT);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const getItemName = useCallback(
    (id: string) => {
      const menuItem = menuItems.find((m) => m.id === String(id));
      if (!menuItem) return id;
      return (
        menuItem.translations?.[i18n.language]?.name ??
        menuItem.name ??
        id
      );
    },
    [menuItems, i18n.language]
  );

  const finishClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const animateClose = useCallback(() => {
    translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(finishClose)();
      }
    });
  }, [translateY, finishClose]);

  useEffect(() => {
    if (visible) {
      translateY.value = SHEET_HEIGHT;
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    }
  }, [visible, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - translateY.value / SHEET_HEIGHT,
  }));

  const checkout = useCallback(async () => {
    if (items.length === 0 || total <= 0 || isCheckingOut) {
      return;
    }

    setIsCheckingOut(true);

    try {
      const amountCents = Math.round(total * 100);
      const { clientSecret } = await createPaymentIntent(amountCents, 'usd');

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'The Intelligent Bistro',
        returnURL: 'intelligentbistro://stripe-redirect',
      });

      if (initError) {
        Alert.alert(t('cart.paymentError'), initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert(t('cart.paymentError'), presentError.message);
        }
        return;
      }

      Alert.alert(t('cart.successTitle'), t('cart.paymentSuccess'), [
        {
          text: t('cart.ok'),
          onPress: () => {
            clearCart();
            animateClose();
          },
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('cart.checkoutFailed');
      Alert.alert(t('cart.paymentError'), message);
    } finally {
      setIsCheckingOut(false);
    }
  }, [
    items.length,
    total,
    isCheckingOut,
    initPaymentSheet,
    presentPaymentSheet,
    clearCart,
    animateClose,
    t,
  ]);

  if (!visible) {
    return null;
  }

  const handleClearCart = () => {
    Alert.alert(
      t('cart.clearConfirmTitle'),
      t('cart.clearConfirmMessage'),
      [
        { text: t('cart.clearConfirmCancel'), style: 'cancel' },
        {
          text: t('cart.clearConfirmOk'),
          style: 'destructive',
          onPress: () => {
            clearCart();
            animateClose();
          },
        },
      ]
    );
  };

  const cartEmpty = items.length === 0;

  return (
    <View style={StyleSheet.absoluteFill} className="z-50">
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={animateClose}
        accessibilityLabel={t('cart.close')}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
        />
      </Pressable>

      <Animated.View style={[styles.sheet, { height: SHEET_HEIGHT }, sheetStyle]}>
        <View className="flex-1 bg-white rounded-t-3xl">
        <View className="items-center pt-3 pb-2">
          <View className="w-12 h-1 rounded-full bg-gray-300" />
        </View>

        <View className="px-6 pb-3 flex-row justify-between items-center border-b border-gray-100">
          <Text className="text-xl font-bold text-bistro-dark">{t('cart.title')}</Text>
          <Text className="text-lg font-bold text-bistro-gold">
            ${total.toFixed(2)}
          </Text>
        </View>

        <ScrollView className="flex-1 px-6 pt-2">
          {cartEmpty ? (
            <Text className="text-gray-500 text-center mt-8">{t('cart.empty')}</Text>
          ) : (
            items.map((item) => (
              <View
                key={item.itemId}
                className="py-4 border-b border-gray-100"
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-4">
                    <Text className="text-base font-bold text-bistro-dark">
                      {getItemName(item.itemId)}
                    </Text>
                    {item.notes ? (
                      <Text className="text-sm text-gray-500 mt-1 italic">
                        {item.notes}
                      </Text>
                    ) : null}
                    <Text className="text-sm text-bistro-gold mt-1">
                      ${(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() =>
                        updateQuantity(item.itemId, item.quantity - 1)
                      }
                      className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                    >
                      <Text className="text-lg font-bold text-bistro-dark">−</Text>
                    </TouchableOpacity>
                    <Text className="mx-3 text-base font-bold text-bistro-dark min-w-[20px] text-center">
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        updateQuantity(item.itemId, item.quantity + 1)
                      }
                      className="w-9 h-9 rounded-full bg-bistro-dark items-center justify-center"
                    >
                      <Text className="text-lg font-bold text-white">+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View className="px-6 pb-8 pt-4 border-t border-gray-100">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-bistro-dark">{t('cart.total')}</Text>
            <Text className="text-xl font-bold text-bistro-gold">
              ${total.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            testID="cart-pay-now"
            onPress={checkout}
            disabled={cartEmpty || isCheckingOut}
            className={`py-4 rounded-xl items-center mb-3 ${
              cartEmpty || isCheckingOut ? 'bg-gray-200' : 'bg-bistro-gold'
            }`}
          >
            <Text
              className={`font-bold ${
                cartEmpty || isCheckingOut ? 'text-gray-400' : 'text-white'
              }`}
            >
              {isCheckingOut ? t('cart.processing') : t('cart.payNow')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearCart}
            disabled={cartEmpty}
            className={`py-4 rounded-xl items-center ${
              cartEmpty ? 'bg-gray-200' : 'bg-red-50 border border-red-200'
            }`}
          >
            <Text
              className={`font-bold ${
                cartEmpty ? 'text-gray-400' : 'text-red-600'
              }`}
            >
              {t('cart.clear')}
            </Text>
          </TouchableOpacity>
        </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
