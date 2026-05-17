import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Text, View } from './styled';
import { useMenuItems } from '../hooks/useMenuItems';
import type { MenuItem } from '../types/menu';
import { CategoryCard } from './CategoryCard';
import { MenuItemCard } from './MenuItemCard';

const AnimatedView = Animated.createAnimatedComponent(View);
const useNativeBlur = Platform.OS === 'ios';

const FLAT_LIST_PERF = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 10,
  windowSize: 5,
  removeClippedSubviews: Platform.OS !== 'web',
} as const;

function getNumColumns(width: number): number {
  if (width < 768) return 1;
  if (width < 1024) return 2;
  return 3;
}

export function MenuList() {
  const { width } = useWindowDimensions();
  const { items, loading, error, refetch } = useMenuItems();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const numColumns = getNumColumns(width);

  const { categories, categoryCounts } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.category) continue;
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    const sorted = Array.from(counts.keys()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    return { categories: sorted, categoryCounts: counts };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return [];
    return items.filter((item) => item.category === selectedCategory);
  }, [items, selectedCategory]);

  const handleSelectCategory = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  const renderMenuItem = useCallback(
    ({ item }: { item: MenuItem }) => <MenuItemCard item={item} />,
    []
  );

  const renderCategory = useCallback(
    ({ item: category }: { item: string }) => (
      <CategoryCard
        category={category}
        itemCount={categoryCounts.get(category) ?? 0}
        onPress={handleSelectCategory}
      />
    ),
    [categoryCounts, handleSelectCategory]
  );

  const menuKeyExtractor = useCallback((item: MenuItem) => item.id, []);
  const categoryKeyExtractor = useCallback((category: string) => category, []);

  const loadingEmpty = useMemo(
    () => (
      <View className="py-12 items-center">
        <ActivityIndicator color="#D4AF37" size="large" />
        <Text className="text-bistro-dark mt-4">Loading menu...</Text>
      </View>
    ),
    []
  );

  const errorEmpty = useMemo(
    () => (
      <View className="py-12 px-4 items-center">
        <Text className="text-red-600 text-center mb-2">{error}</Text>
        <Text className="text-bistro-gold font-semibold" onPress={refetch}>
          Tap to retry
        </Text>
      </View>
    ),
    [error, refetch]
  );

  const categoryEmpty = useMemo(
    () => (
      <View className="py-12 items-center">
        <Text className="text-gray-500">No categories found.</Text>
      </View>
    ),
    []
  );

  const filteredEmpty = useMemo(
    () => (
      <View className="py-12 items-center">
        <Text className="text-gray-500">No items in this category.</Text>
      </View>
    ),
    []
  );

  const listHeader = useMemo(() => {
    if (!selectedCategory) return null;

    const backButton = (
      <View className="flex-row items-center">
        <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        <Text className="text-base font-bold text-bistro-dark ml-1">{selectedCategory}</Text>
      </View>
    );

    return (
      <View className="mb-4 self-start">
        <Pressable onPress={handleBack}>
          {useNativeBlur ? (
            <BlurView intensity={50} tint="light" style={styles.backPillBlur}>
              {backButton}
            </BlurView>
          ) : (
            <View className="rounded-full px-4 py-2 border border-white/60 bg-white/50">
              {backButton}
            </View>
          )}
        </Pressable>
      </View>
    );
  }, [selectedCategory, handleBack]);

  if (loading) {
    return loadingEmpty;
  }

  if (error) {
    return errorEmpty;
  }

  const columnWrapperStyle = numColumns > 1 ? styles.columnWrapper : undefined;

  return (
    <AnimatedView layout={LinearTransition.springify().damping(18)} style={styles.list}>
      {selectedCategory === null ? (
        <FlatList
          key={`categories-${numColumns}`}
          data={categories}
          renderItem={renderCategory}
          keyExtractor={categoryKeyExtractor}
          numColumns={numColumns}
          {...FLAT_LIST_PERF}
          columnWrapperStyle={columnWrapperStyle}
          contentContainerStyle={styles.contentContainer}
          ListEmptyComponent={categoryEmpty}
          style={styles.list}
        />
      ) : (
        <FlatList
          key={`items-${numColumns}-${selectedCategory}`}
          data={filteredItems}
          renderItem={renderMenuItem}
          keyExtractor={menuKeyExtractor}
          numColumns={numColumns}
          {...FLAT_LIST_PERF}
          columnWrapperStyle={columnWrapperStyle}
          contentContainerStyle={styles.contentContainer}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={filteredEmpty}
          style={styles.list}
        />
      )}
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    gap: 12,
  },
  backPillBlur: {
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
