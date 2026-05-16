import React, { useCallback, useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { View, Text, TouchableOpacity, ScrollView } from './styled';
import { useCartStore } from '../store/useCartStore';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

interface CartModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CartModal({ visible, onClose }: CartModalProps) {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);

  const translateY = useSharedValue(SHEET_HEIGHT);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

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

  if (!visible) {
    return null;
  }

  const handleClearCart = () => {
    clearCart();
    animateClose();
  };

  return (
    <View style={StyleSheet.absoluteFill} className="z-50">
      <Pressable style={StyleSheet.absoluteFill} onPress={animateClose}>
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
          <Text className="text-xl font-bold text-bistro-dark">Your Cart</Text>
          <Text className="text-lg font-bold text-bistro-gold">
            ${total.toFixed(2)}
          </Text>
        </View>

        <ScrollView className="flex-1 px-6 pt-2">
          {items.length === 0 ? (
            <Text className="text-gray-500 text-center mt-8">
              Your cart is empty. Ask the AI to add something!
            </Text>
          ) : (
            items.map((item) => (
              <View
                key={item.itemId}
                className="py-4 border-b border-gray-100"
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-4">
                    <Text className="text-base font-bold text-bistro-dark">
                      {item.itemId}
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
            <Text className="text-lg font-bold text-bistro-dark">Total</Text>
            <Text className="text-xl font-bold text-bistro-gold">
              ${total.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleClearCart}
            disabled={items.length === 0}
            className={`py-4 rounded-xl items-center ${
              items.length === 0 ? 'bg-gray-200' : 'bg-red-50 border border-red-200'
            }`}
          >
            <Text
              className={`font-bold ${
                items.length === 0 ? 'text-gray-400' : 'text-red-600'
              }`}
            >
              Clear Cart
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
