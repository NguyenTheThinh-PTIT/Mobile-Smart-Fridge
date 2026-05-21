import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, RefreshControl } from 'react-native';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { authActions } from '@/store/authSlice';
import { useResponsive } from '@/core/theme/responsive';
import { useInventory } from './InventoryContext';
import { InventoryFood } from './InventoryContext';

const CATEGORIES = ['Tất cả', 'Rau củ quả', 'Thịt', 'Sữa & Bơ', 'Hải sản', 'Đồ khô'] as const;


/**
 * Inventory Screen - Premium Design Redamp
 */
export const InventoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useAppDispatch();
  const { width, scale } = useResponsive();
  const cardWidth = (width - scale(48)) / 2;
  const { foods, syncFromServer } = useInventory();

  const handleLogout = () => {
    dispatch(authActions.logout());
  };

  useEffect(() => {
    console.log('🔥 InventoryScreen mounted - calling syncFromServer');
    syncFromServer();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    syncFromServer().finally(() => setRefreshing(false));
  }, [syncFromServer]);

  const mapFoodToDisplay = useCallback((food: InventoryFood) => {
    const today = new Date();
    const expiryDate = food.expiryDate ? new Date(food.expiryDate.split('/').reverse().join('-')) : null;
    const daysLeft = expiryDate ? Math.max(0, Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))) : 999;
    
    let tag = 'Tốt';
    let color = '#E8F5E9';
    let expiryText = 'Chưa cập nhật';
    
    if (!food.expiryDate) {
      tag = 'Tốt';
      color = '#FFF3E0';
      expiryText = 'Chưa cập nhật ngày hết hạn';
    } else if (daysLeft === 0) {
      tag = 'Khẩn cấp';
      color = '#FFE5E5';
      expiryText = 'Hết hạn hôm nay';
    } else if (daysLeft <= 2) {
      tag = 'Khẩn cấp';
      color = '#FCE4EC';
      expiryText = `Hết hạn trong ${daysLeft} ngày`;
    } else if (daysLeft <= 7) {
      tag = 'Cảnh báo';
      color = '#FFEBEE';
      expiryText = `Còn ${daysLeft} ngày`;
    } else {
      tag = 'Tốt';
      color = '#E3F2FD';
      expiryText = `Còn ${daysLeft} ngày`;
    }

    const emoji = getEmojiForFood(food.name, food.category);
    
    return {
      emoji,
      expiry: expiryText,
      color,
      tag,
    };
  }, []);

  const getEmojiForFood = (name: string, category: string): string => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('cà chua') || nameLower.includes('tomato')) return '🍅';
    if (nameLower.includes('thịt') || category === 'Thịt') return '🥩';
    if (nameLower.includes('sữa') || category === 'Sữa & Bơ') return '🥛';
    if (nameLower.includes('cá') || category === 'Hải sản') return '🐟';
    if (category === 'Rau củ quả') return '🥬';
    if (category === 'Đồ khô') return '🍜';
    return '🍎';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {/* Header Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.headerContainer}>
          <View>
            <Text style={[styles.greeting, { fontSize: scale(14) }]}>Good Morning,</Text>
            <Text style={[styles.userName, { fontSize: scale(28) }]}>Truong Vu 👋</Text>
          </View>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleLogout}>
            <Text style={styles.avatarText}>TV</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* AI Banner Section (Premium Feel) */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.bannerContainer}>
          <View style={styles.bannerBackgroundShape1} />
          <View style={styles.bannerBackgroundShape2} />
          <Text style={[styles.bannerTitle, { fontSize: scale(22) }]}>✨ Master Your Fridge</Text>
          <Text style={styles.bannerSubtitle}>Let AI scan your ingredients and suggest the perfect meal plan for today.</Text>
          <TouchableOpacity style={styles.bannerButton} activeOpacity={0.8}>
            <Text style={styles.bannerButtonText}>Scan Now 📷</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Categories (Pills) */}
        <Animated.View entering={FadeInRight.delay(300).duration(500)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
            {CATEGORIES.map((cat, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Inventory List Section */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Ingredients</Text>
          <Text style={styles.seeAll}>See All</Text>
        </Animated.View>

        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.gridContainer}
        >
          {foods
            .filter((food) => activeCategory === 'Tất cả' || food.category === activeCategory)
            .map((food, index) => {
              const displayItem = mapFoodToDisplay(food);
              return (
                <Animated.View
                  key={food.id}
                  entering={FadeInDown.delay(400 + index * 100).duration(500)}
                  layout={Layout.springify()}
                  style={[styles.cardWrapper, { width: cardWidth }]}
                >
                <TouchableOpacity 
                  style={[styles.itemCard, { backgroundColor: '#FFFFFF' }]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('FoodDetail', { foodId: food.id })}
                >
                  <View style={[styles.imageContainer, { backgroundColor: displayItem.color }]}>
                    <Text style={styles.itemEmoji}>{displayItem.emoji}</Text>
                    <View style={[
                      styles.badge,
                      displayItem.tag === 'Khẩn cấp' ? styles.badgeUrgent : styles.badgeFresh
                    ]}>
                      <Text style={styles.badgeText}>{displayItem.tag}</Text>
                    </View>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{food.name}</Text>
                    <Text style={styles.itemExpiry}>{displayItem.expiry}</Text>
                  </View>
                </TouchableOpacity>
                </Animated.View>
              );
            })}
        </ScrollView>

      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View entering={FadeInDown.delay(800).duration(500)} style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.9}
          onPress={() => navigation?.navigate('FoodForm', { mode: 'add' })}
        >
          <Text style={[styles.fabIcon, { fontSize: scale(32) }]}>+</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FE', // Màu nền thanh lịch
  },
  scrollContent: {
    paddingBottom: 120, // Để tránh chèn lên nút FAB
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userName: {
    fontSize: 28,
    color: '#0F172A',
    fontWeight: '800',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  bannerContainer: {
    marginHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#0F172A', // Nền đen sâu premium
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 24,
  },
  bannerBackgroundShape1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(59, 130, 246, 0.4)', // Đổi chút màu gradient xanh
    top: -50,
    right: -20,
    // Note: React Native does not natively support 'filter: blur' outside Web. 
    // Usually achieved via opacity or SVG radial gradients in bare RN.
    opacity: 0.8,
  },
  bannerBackgroundShape2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
    bottom: -30,
    left: -10,
    opacity: 0.8,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    zIndex: 1,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 20,
    zIndex: 1,
    maxWidth: '85%',
  },
  bannerButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignSelf: 'flex-start',
    zIndex: 1,
  },
  bannerButtonText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeAll: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  cardWrapper: {
    marginBottom: 16,
    marginHorizontal: 8,
  },
  itemCard: {
    borderRadius: 20,
    padding: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageContainer: {
    height: 100,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  itemEmoji: {
    fontSize: 48,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeUrgent: {
    backgroundColor: '#EF4444',
  },
  badgeFresh: {
    backgroundColor: '#10B981',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cardInfo: {
    gap: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemExpiry: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
    marginTop: -4,
  },
});
