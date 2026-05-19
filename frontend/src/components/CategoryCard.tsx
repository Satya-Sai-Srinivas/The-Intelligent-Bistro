import React, { memo } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { View, Text } from './styled';
import { translateCategory } from '../utils/categoryI18n';

const AnimatedView = Animated.createAnimatedComponent(View);

interface CategoryCardProps {
  category: string;
  itemCount: number;
  onPress: (category: string) => void;
}

const SPRING_CONFIG = { damping: 15, stiffness: 150 };
const useNativeBlur = Platform.OS === 'ios';

function CategoryCardComponent({ category, itemCount, onPress }: CategoryCardProps) {
  const { t } = useTranslation();
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

  const cardContent = (
    <View className="bg-white/40 p-5 min-h-[100px] justify-center">
      <Text className="text-lg font-bold text-bistro-dark">
        {translateCategory(category, t)}
      </Text>
      <Text className="text-sm text-bistro-gold mt-1 font-semibold">
        {t('categories.itemCount', { count: itemCount })}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={() => onPress(category)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.cell}
    >
      <AnimatedView style={[styles.shadow, animatedStyle]}>
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

export const CategoryCard = memo(CategoryCardComponent);

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 12,
  },
  glassCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  shadow: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
});
