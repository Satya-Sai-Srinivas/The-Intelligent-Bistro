import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Text, View } from './styled';
import { useCategories } from '../hooks/useCategories';
import { useMenuItems } from '../hooks/useMenuItems';
import type { Category, MenuItem } from '../types/menu';
import { CategoryCard } from './CategoryCard';
import { MenuItemCard } from './MenuItemCard';
import { translateCategory } from '../utils/categoryI18n';

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

function itemMatchesSearch(item: MenuItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;

  const haystacks: string[] = [item.name, item.description];
  if (item.translations) {
    for (const translation of Object.values(item.translations)) {
      haystacks.push(translation.name, translation.description);
    }
  }

  return haystacks.some((s) => s?.toLowerCase().includes(q));
}

export function MenuList({ searchQuery = '' }: { searchQuery?: string }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { items, loading: itemsLoading, error: itemsError, refetch: refetchItems } =
    useMenuItems();
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const numColumns = getNumColumns(width);

  const loading = itemsLoading || categoriesLoading;
  const error = itemsError ?? categoriesError;
  const refetch = useCallback(() => {
    void refetchItems();
    void refetchCategories();
  }, [refetchItems, refetchCategories]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchItems(), refetchCategories()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchItems, refetchCategories]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of items) {
      if (!item.category) continue;
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }

    return counts;
  }, [items]);

  const trimmedSearch = searchQuery.trim();
  const isSearching = trimmedSearch.length > 0;

  const filteredItems = useMemo(() => {
    if (isSearching) {
      return items.filter((item) => itemMatchesSearch(item, trimmedSearch));
    }
    if (!selectedCategory) return [];
    return items.filter((item) => item.category === selectedCategory);
  }, [items, selectedCategory, trimmedSearch, isSearching]);

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
    ({ item: category }: { item: Category }) => (
      <CategoryCard
        category={category}
        itemCount={categoryCounts.get(category.name) ?? 0}
        onPress={handleSelectCategory}
      />
    ),
    [categoryCounts, handleSelectCategory]
  );

  const menuKeyExtractor = useCallback((item: MenuItem) => item.id, []);
  const categoryKeyExtractor = useCallback((category: Category) => category.id, []);

  const loadingEmpty = useMemo(
    () => (
      <View className="py-12 items-center">
        <ActivityIndicator color="#D4AF37" size="large" />
        <Text className="text-bistro-dark mt-4">{t('menu.loading')}</Text>
      </View>
    ),
    [t]
  );

  const errorEmpty = useMemo(
    () => (
      <View className="py-12 px-4 items-center">
        <Text className="text-red-600 text-center mb-2">{t('menu.loadError')}</Text>
        <Text className="text-bistro-gold font-semibold" onPress={refetch}>
          {t('menu.retry')}
        </Text>
      </View>
    ),
    [refetch, t]
  );

  const categoryEmpty = useMemo(
    () => (
      <View className="py-12 items-center">
        <Text className="text-gray-500">{t('menu.noCategories')}</Text>
      </View>
    ),
    [t]
  );

  const filteredEmpty = useMemo(
    () => (
      <View className="py-12 px-6 items-center">
        {isSearching ? (
          <>
            <Text className="text-gray-500 text-center">
              {t('menu.noSearchResults', "Didn't find that on the menu?")}
            </Text>
            <Text className="text-gray-400 text-center text-sm italic mt-2">
              {t(
                'menu.noSearchResultsHint',
                "No worries — AI's got you. Hit Order when you're ready."
              )}
            </Text>
          </>
        ) : (
          <Text className="text-gray-500">{t('menu.noItemsInCategory')}</Text>
        )}
      </View>
    ),
    [isSearching, t]
  );

  const renderCategoryBackBar = useCallback(() => {
    if (!selectedCategory) return null;

    const backButton = (
      <View className="flex-row items-center">
        <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        <Text className="text-base font-bold text-bistro-dark ml-1">
          {translateCategory(selectedCategory, t)}
        </Text>
      </View>
    );

    return (
      <Pressable
        onPress={handleBack}
        style={styles.backPillPressable}
        accessibilityLabel={`Back to categories from ${translateCategory(selectedCategory, t)}`}
        accessibilityRole="button"
      >
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
    );
  }, [selectedCategory, handleBack, t]);

  if (loading) {
    return loadingEmpty;
  }

  if (error) {
    return errorEmpty;
  }

  const columnWrapperStyle = numColumns > 1 ? styles.columnWrapper : undefined;

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor="#D4AF37"
      colors={['#D4AF37']}
    />
  );

  return (
    <AnimatedView layout={LinearTransition.springify().damping(18)} style={styles.list}>
      {isSearching ? (
        <View style={styles.itemViewContainer}>
          {selectedCategory ? (
            <View style={styles.stickyBackBar}>{renderCategoryBackBar()}</View>
          ) : null}
          <FlatList
            key={`search-${numColumns}`}
            data={filteredItems}
            renderItem={renderMenuItem}
            keyExtractor={menuKeyExtractor}
            numColumns={numColumns}
            {...FLAT_LIST_PERF}
            columnWrapperStyle={columnWrapperStyle}
            contentContainerStyle={styles.contentContainer}
            ListEmptyComponent={filteredEmpty}
            refreshControl={refreshControl}
            style={styles.listFlex}
          />
        </View>
      ) : selectedCategory === null ? (
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
          refreshControl={refreshControl}
          style={styles.list}
        />
      ) : (
        <View style={styles.itemViewContainer}>
          <View style={styles.stickyBackBar}>{renderCategoryBackBar()}</View>
          <FlatList
            key={`items-${numColumns}-${selectedCategory}`}
            data={filteredItems}
            renderItem={renderMenuItem}
            keyExtractor={menuKeyExtractor}
            numColumns={numColumns}
            {...FLAT_LIST_PERF}
            columnWrapperStyle={columnWrapperStyle}
            contentContainerStyle={styles.contentContainer}
            ListEmptyComponent={filteredEmpty}
            refreshControl={refreshControl}
            style={styles.listFlex}
          />
        </View>
      )}
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  itemViewContainer: {
    flex: 1,
  },
  listFlex: {
    flex: 1,
  },
  stickyBackBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 10,
    backgroundColor: 'rgba(250, 248, 245, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  backPillPressable: {
    alignSelf: 'flex-start',
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
