import React, { memo, useCallback } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { View, Text } from './styled';
import { selectItemQuantity, useCartStore } from '../store/useCartStore';
import { useLanguageStore } from '../store/useLanguageStore';
import type { MenuItem } from '../types/menu';
import { getMenuItemDisplayFields } from '../utils/menuLocale';

const AnimatedView = Animated.createAnimatedComponent(View);

interface MenuItemCardProps {
  item: MenuItem;
}

const SPRING_CONFIG = { damping: 15, stiffness: 150 };
const useNativeBlur = Platform.OS === 'ios';
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

function MenuItemCardComponent({ item }: MenuItemCardProps) {
  const currentLanguage = useLanguageStore((s) => s.currentLanguage);
  const { name, description } = getMenuItemDisplayFields(item, currentLanguage);
  const itemId = String(item.id);
  const quantity = useCartStore(selectItemQuantity(itemId));
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  const handleAdd = useCallback(() => {
    addItem({ itemId, quantity: 1, price: item.price });
  }, [addItem, itemId, item.price]);

  const handleDecrement = useCallback(() => {
    if (quantity > 0) {
      updateQuantity(itemId, quantity - 1);
    }
  }, [updateQuantity, itemId, quantity]);

  const cardContent = (
    <View className="bg-white/40 p-4">
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : null}
      <View className="flex-row justify-between items-start">
        <Text className="text-lg font-bold text-bistro-dark flex-1 pr-2">{name}</Text>
        <Text className="text-lg font-bold text-bistro-gold">${item.price.toFixed(2)}</Text>
      </View>
      <Text className="text-gray-500 mt-1">{description}</Text>

      <View className="flex-row items-center self-start mt-3 rounded-full border border-white/60 bg-white/50 overflow-hidden">
        {quantity > 0 ? (
          <Pressable
            onPress={handleDecrement}
            accessibilityLabel={`Remove one ${name} from cart`}
            hitSlop={HIT_SLOP}
            style={styles.pillSegment}
          >
            <View className="flex-1 bg-white/40 items-center justify-center">
              <Feather name="minus" size={18} color="#1A1A1A" />
            </View>
          </Pressable>
        ) : null}
        <View className="px-3 py-2 min-w-[32px] items-center justify-center">
          <Text className="font-bold text-bistro-dark text-base">{quantity}</Text>
        </View>
        <Pressable
          testID={`menu-add-${itemId}`}
          accessibilityLabel={`Add ${name} to cart`}
          onPress={handleAdd}
          hitSlop={HIT_SLOP}
          style={styles.pillSegment}
        >
          <View className="flex-1 bg-bistro-gold/90 items-center justify-center">
            <Feather name="plus" size={18} color="#FFFFFF" />
          </View>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.cell}>
      <AnimatedView style={[styles.shadow, styles.cardWrapper, animatedStyle]}>
        {useNativeBlur ? (
          <BlurView intensity={60} tint="light" style={styles.glassCard}>
            {cardContent}
          </BlurView>
        ) : (
          <View className="rounded-2xl overflow-hidden border border-white/60 bg-white/70">
            {cardContent}
          </View>
        )}
      </AnimatedView>
    </Pressable>
  );
}

export const MenuItemCard = memo(MenuItemCardComponent);

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 12,
  },
  cardWrapper: {},
  glassCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  thumbnail: {
    width: '100%',
    height: 144,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 12,
  },
  shadow: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  pillSegment: {
    width: 36,
    height: 36,
  },
});
