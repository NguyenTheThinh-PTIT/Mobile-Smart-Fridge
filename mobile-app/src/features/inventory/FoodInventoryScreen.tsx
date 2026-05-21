import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useInventory } from './InventoryContext';
import { useAppSelector } from '@/store/hooks';
import { AppHeader } from '@/core/base_widgets';
import { useResponsive } from '@/core/theme/responsive';

type InventoryNavigationProp = NavigationProp<any>;

const CARD_BACKGROUNDS = ['#1C1A17', '#ECF7E9', '#E6F6F6', '#EEF5E6', '#F1F5F9'];
const CARD_ACCENTS = ['#FFEDD5', '#D1FAE5', '#CFFAFE', '#DCFCE7', '#E2E8F0'];

const parseVietnameseDate = (date: string) => {
  const [day, month, year] = date.split('/').map(Number);
  if (!day || !month || !year) {
    return null;
  }
  return new Date(year, month - 1, day);
};

const computeStatus = (expiryDate: string | undefined) => {
  if (!expiryDate) {
    return { label: 'Chưa có HSD', type: 'neutral' as const };
  }
  const date = parseVietnameseDate(expiryDate);
  if (!date) {
    return { label: 'Chưa có HSD', type: 'neutral' as const };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff <= 2) {
    return { label: 'Sắp hết hạn', type: 'danger' as const };
  }
  if (diff <= 7) {
    return { label: `Còn ${diff} ngày`, type: 'neutral' as const };
  }
  return { label: 'Tươi mới', type: 'fresh' as const };
};

const formatQuantity = (quantity: number, unit: string) => `${quantity} ${unit}`;

export const FoodInventoryScreen: React.FC = () => {
  const navigation = useNavigation<InventoryNavigationProp>();
  const { foods } = useInventory();
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const { scale, fontScale } = useResponsive();
  const textInputMaxFontSizeMultiplier = Math.max(1.2, Math.min(fontScale, 1.8));

  const handleTakePhoto = async () => {
    setShowImagePickerModal(false);
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]) {
        navigation.navigate('InvoicePreview', {
          imageUri: result.assets[0].uri,
        });
      }
    } catch (error) {
      console.warn('[FoodInventoryScreen] Error taking photo:', error);
    }
  };

  const handlePickImage = async () => {
    setShowImagePickerModal(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]) {
        navigation.navigate('InvoicePreview', {
          imageUri: result.assets[0].uri,
        });
      }
    } catch (error) {
      console.warn('[FoodInventoryScreen] Error picking image:', error);
    }
  };

  const categories = useMemo(() => {
    const next = new Set<string>(['Tất cả']);
    foods.forEach((food) => next.add(food.category));
    return Array.from(next);
  }, [foods]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return foods.filter((item) => {
      const matchSearch = q ? item.name.toLowerCase().includes(q) : true;
      const matchCategory = activeCategory === 'Tất cả' ? true : item.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [foods, search, activeCategory]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const normalizedPage = Math.min(currentPage, totalPages);
  const pagedItems = filteredItems.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);
  const maxVisiblePageButtons = 5;
  const pageWindowStart = Math.max(
    1,
    Math.min(
      normalizedPage - Math.floor(maxVisiblePageButtons / 2),
      totalPages - maxVisiblePageButtons + 1
    )
  );
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + maxVisiblePageButtons - 1);
  const visiblePages = Array.from(
    { length: pageWindowEnd - pageWindowStart + 1 },
    (_, index) => pageWindowStart + index
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, activeCategory]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppHeader marginBottom={scale(14)} />

        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { fontSize: scale(24) }]}>Kho Thực Phẩm</Text>
            <View style={styles.syncPill}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>Đã đồng bộ</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => setShowImagePickerModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={scale(20)} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={scale(16)} color="#A0A5BA" />
          <TextInput
            placeholder="Tìm thực phẩm"
            placeholderTextColor="#A0A5BA"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryPill, activeCategory === category && styles.categoryPillActive]}
              onPress={() => setActiveCategory(category)}
              activeOpacity={0.85}
            >
              <Text style={[styles.categoryText, activeCategory === category && styles.categoryTextActive]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          {pagedItems.map((item, index) => {
            const status = computeStatus(item.expiryDate);
            const cardBackground = CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length];
            const cardAccent = CARD_ACCENTS[index % CARD_ACCENTS.length];

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, item.id === '1' && styles.cardHighlighted]}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('FoodDetail', { foodId: item.id })}
              >
                <View style={[styles.cardImage, { backgroundColor: cardBackground }]}>
                  <View style={[styles.imageAccent, { backgroundColor: cardAccent }]} />
                  <Text style={styles.imageEmoji}>{index % 2 === 0 ? '🥬' : '🥩'}</Text>
                </View>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemQuantity}>{formatQuantity(item.quantity, item.unit)}</Text>
                <View
                  style={[
                    styles.statusPill,
                    status.type === 'danger'
                      ? styles.statusDanger
                      : status.type === 'fresh'
                      ? styles.statusFresh
                      : styles.statusNeutral,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      status.type === 'danger'
                        ? styles.statusTextDanger
                        : status.type === 'fresh'
                        ? styles.statusTextFresh
                        : styles.statusTextNeutral,
                    ]}
                  >
                    {status.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredItems.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Chưa có thực phẩm phù hợp</Text>
              <Text style={styles.emptyText}>Hãy thêm thực phẩm mới bằng nút dấu cộng ở giữa thanh tab.</Text>
            </View>
          )}
        </View>

        {filteredItems.length > pageSize ? (
          <View style={styles.paginationWrap}>
            <TouchableOpacity
              style={[styles.pageNavButton, normalizedPage === 1 ? styles.pageNavDisabled : null]}
              activeOpacity={0.85}
              disabled={normalizedPage === 1}
              onPress={() => setCurrentPage(1)}
            >
              <Ionicons
                name="play-skip-back-outline"
                size={scale(14)}
                color={normalizedPage === 1 ? '#94A3B8' : '#334155'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pageNavButton, normalizedPage === 1 ? styles.pageNavDisabled : null]}
              activeOpacity={0.85}
              disabled={normalizedPage === 1}
              onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              <Ionicons name="chevron-back" size={scale(16)} color={normalizedPage === 1 ? '#94A3B8' : '#334155'} />
            </TouchableOpacity>

            <View style={styles.pageDotsWrap}>
              {visiblePages.map((pageNumber) => {
                const isActive = pageNumber === normalizedPage;
                return (
                  <TouchableOpacity
                    key={`inventory-page-${pageNumber}`}
                    style={[styles.pageDot, isActive ? styles.pageDotActive : null]}
                    onPress={() => setCurrentPage(pageNumber)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.pageDotText, isActive ? styles.pageDotTextActive : null]}>{pageNumber}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.pageNavButton, normalizedPage === totalPages ? styles.pageNavDisabled : null]}
              activeOpacity={0.85}
              disabled={normalizedPage === totalPages}
              onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              <Ionicons
                name="chevron-forward"
                size={scale(16)}
                color={normalizedPage === totalPages ? '#94A3B8' : '#334155'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pageNavButton, normalizedPage === totalPages ? styles.pageNavDisabled : null]}
              activeOpacity={0.85}
              disabled={normalizedPage === totalPages}
              onPress={() => setCurrentPage(totalPages)}
            >
              <Ionicons
                name="play-skip-forward-outline"
                size={scale(14)}
                color={normalizedPage === totalPages ? '#94A3B8' : '#334155'}
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        transparent
        visible={showImagePickerModal}
        animationType="slide"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowImagePickerModal(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={scale(24)} color="#0F172A" />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { fontSize: scale(18) }]}>Chọn cách nhập sản phẩm</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.modalBody}>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="image" size={scale(32)} color="#F97316" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { fontSize: scale(16) }]}>Tải từ thiết bị</Text>
                  <Text style={[styles.optionSubtitle, { fontSize: scale(14) }]}>
                    Chọn ảnh hoá đơn từ thư viện
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={scale(24)} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={handleTakePhoto}
                activeOpacity={0.7}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="camera" size={scale(32)} color="#F97316" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { fontSize: scale(16) }]}>Chụp ảnh</Text>
                  <Text style={[styles.optionSubtitle, { fontSize: scale(14) }]}>
                    Chụp ảnh hoá đơn bằng camera
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={scale(24)} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 8,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  searchWrapper: {
    height: 54,
    borderRadius: 10,
    backgroundColor: '#F6F6F6',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#32343E',
    paddingVertical: 0,
  },
  categoriesRow: {
    paddingBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryPillActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryTextActive: {
    color: '#FFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '47.5%',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHighlighted: {
    borderColor: '#FB923C',
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  cardImage: {
    height: 120,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageAccent: {
    position: 'absolute',
    right: -16,
    top: -16,
    width: 70,
    height: 70,
    borderRadius: 35,
    opacity: 0.6,
  },
  imageEmoji: {
    fontSize: 42,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 6,
  },
  itemQuantity: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F97316',
    marginBottom: 8,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDanger: {
    backgroundColor: '#FEF2F2',
  },
  statusFresh: {
    backgroundColor: '#EFF6FF',
  },
  statusNeutral: {
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusTextDanger: {
    color: '#EF4444',
  },
  statusTextFresh: {
    color: '#64748B',
  },
  statusTextNeutral: {
    color: '#64748B',
  },
  emptyBox: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  paginationWrap: {
    marginTop: 6,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pageNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  pageNavDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  pageDotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    maxWidth: '72%',
  },
  pageDot: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageDotActive: {
    borderColor: '#FF7622',
    backgroundColor: '#FF7622',
  },
  pageDotText: {
    color: '#334155',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  pageDotTextActive: {
    color: '#FFFFFF',
  },
  aiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  ocrMenu: {
    position: 'absolute',
    bottom: 60,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 140,
  },
  ocrMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ocrMenuText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
});
