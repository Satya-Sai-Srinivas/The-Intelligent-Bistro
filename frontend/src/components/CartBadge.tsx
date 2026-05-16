import React from 'react';
import Animated from 'react-native-reanimated';
import { TouchableOpacity, Text } from './styled';
import { useCartBadgeBounce } from '../hooks/useCartBadgeBounce';

interface CartBadgeProps {
  cartCount: number;
  onPress: () => void;
}

export function CartBadge({ cartCount, onPress }: CartBadgeProps) {
  const animatedStyle = useCartBadgeBounce(cartCount);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        className="bg-bistro-gold px-3 py-1 rounded-full"
        activeOpacity={0.8}
      >
        <Text className="text-white font-bold">Cart: {cartCount}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
