import React, { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { View, Text } from './styled';
import type { Category } from '../types/menu';
import { translateCategory } from '../utils/categoryI18n';

const AnimatedView = Animated.createAnimatedComponent(View);

interface CategoryCardProps {
  category: Category;
  itemCount: number;
  onPress: (category: string) => void;
}

const SPRING_CONFIG = { damping: 15, stiffness: 150 };

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

  return (
    <Pressable
      onPress={() => onPress(category.name)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.cell}
    >
      <AnimatedView style={[styles.shadow, styles.cardClip, animatedStyle]}>
        <View style={styles.card}>
          <Image
            source={{ uri: category.imageUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.footer}>
            <Text style={styles.title}>{translateCategory(category.name, t)}</Text>
            <Text style={styles.count}>
              {t('categories.itemCount', { count: itemCount })}
            </Text>
          </View>
        </View>
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
  cardClip: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    minHeight: 150,
    justifyContent: 'flex-end',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
  shadow: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
});
