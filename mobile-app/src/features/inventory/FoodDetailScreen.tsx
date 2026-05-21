import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { useInventory } from './InventoryContext';
import { useResponsive } from '@/core/theme/responsive';

type InventoryNavigationProp = NavigationProp<any>;

const DEFAULT_FOOD = {
  id: '1',
  name: 'Thịt Bò Mỹ',
  quantity: '3.5 kg',
  category: 'Thực phẩm tươi sống',
};

export const FoodDetailScreen: React.FC = () => {
  const navigation = useNavigation<InventoryNavigationProp>();
  const route = useRoute<any>();
  const { getFoodById } = useInventory();
  const routeFoodId = route?.params?.foodId as string | undefined;
  const routeItem = route?.params?.item as any;
  const item = routeFoodId
    ? { ...DEFAULT_FOOD, ...(getFoodById(routeFoodId) ?? {}), id: routeFoodId }
    : { ...DEFAULT_FOOD, ...(routeItem ?? {}) };
  const [showMenu, setShowMenu] = useState(false);
  const [consumeAmount, setConsumeAmount] = useState(0.5);
  const { scale } = useResponsive();

  useEffect(() => {
    const parent = navigation.getParent?.();
    parent?.setOptions({
      tabBarStyle: { display: 'none' },
    });

    return () => {
      parent?.setOptions({
        tabBarStyle: {
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopColor: '#E2E8F0',
        },
      });
    };
  }, [navigation]);

  const batchItems = useMemo(
    () => [
      {
        id: '001',
        title: 'Lô #001 - Nhập kho 18/10',
        label: 'ƯU TIÊN TIÊU THỤ',
        expiry: 'HSD: 25/10 (Sắp hết hạn)',
        remain: '1.5 kg',
        highlighted: true,
      },
      {
        id: '002',
        title: 'Lô #002 - Nhập kho 20/10',
        label: '',
        expiry: 'HSD: 30/10',
        remain: '2.0 kg',
        highlighted: false,
      },
    ],
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroWrap}>
          <View style={styles.heroTopBar}>
            <View style={styles.appChip}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={scale(16)} color="#F97316" />
              <Text style={styles.appChipText}>FOOD APP</Text>
            </View>
            <TouchableOpacity style={styles.menuBtn} onPress={() => setShowMenu(true)}>
              <Ionicons name="ellipsis-vertical" size={scale(20)} color="#0F172A" />
            </TouchableOpacity>
          </View>
          <View style={styles.heroImage} />

          <View style={styles.summaryCard}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.foodTitle, { fontSize: scale(26) }]}>{item.name}</Text>
              <Text style={styles.foodCategory}>Phân loại: {item.category}</Text>
            </View>
            <View style={styles.totalWrap}>
              <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
              <Text style={styles.totalValue}>3.5 <Text style={styles.totalUnit}>kg</Text></Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <MaterialCommunityIcons name="archive-outline" size={scale(22)} color="#F97316" />
            <Text style={styles.sectionTitle}>Chi tiết Lô hàng (FIFO)</Text>
          </View>
          <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>2 Lô hàng</Text></View>
        </View>

        {batchItems.map((batch) => (
          <View key={batch.id} style={[styles.batchCard, batch.highlighted && styles.batchCardHighlighted]}>
            <View style={styles.batchImage} />
            <View style={styles.batchContent}>
              <View style={styles.batchHeaderRow}>
                <Text style={styles.batchTitle}>{batch.title}</Text>
                {!!batch.label && <View style={styles.priorityBadge}><Text style={styles.priorityBadgeText}>{batch.label}</Text></View>}
              </View>
              <Text style={styles.batchExpiry}>{batch.expiry}</Text>
              <View style={styles.batchFooterRow}>
                <Text style={styles.batchRemainLabel}>Số lượng còn lại:</Text>
                <Text style={styles.batchRemainValue}>{batch.remain}</Text>
              </View>
            </View>
          </View>
        ))}

        <Text style={styles.subsectionTitle}>Thông tin bảo quản</Text>
        <View style={styles.storageRow}>
          <View style={styles.storageCard}>
            <Ionicons name="snow-outline" size={scale(20)} color="#3B82F6" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.storageLabel}>Nhiệt độ</Text>
              <Text style={styles.storageValue}>-18°C</Text>
            </View>
          </View>
          <View style={styles.storageCard}>
            <MaterialCommunityIcons name="fridge-outline" size={scale(20)} color="#F97316" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.storageLabel}>Vị trí</Text>
              <Text style={styles.storageValue}>Ngăn đông 2</Text>
            </View>
          </View>
        </View>

        <View style={styles.consumeCard}>
          <Text style={styles.consumeLabel}>Lượng tiêu thụ (kg)</Text>
          <View style={styles.stepper}>
            <TouchableOpacity onPress={() => setConsumeAmount((v) => Math.max(0, Number((v - 0.1).toFixed(1))))} style={styles.stepperBtn}>
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{consumeAmount.toFixed(1)}</Text>
            <TouchableOpacity onPress={() => setConsumeAmount((v) => Number((v + 0.1).toFixed(1)))} style={styles.stepperBtnPrimary}>
              <Text style={[styles.stepperBtnText, { color: '#FFF' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.consumeButton} activeOpacity={0.9}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={scale(20)} color="#FFF" />
          <Text style={styles.consumeButtonText}>Tiêu thụ ngay</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent visible={showMenu} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                navigation.navigate('FoodForm', { mode: 'edit', foodId: item.id, item });
              }}
            >
              <Ionicons name="create-outline" size={scale(22)} color="#64748B" />
              <Text style={styles.menuItemText}>Chỉnh sửa thực phẩm</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                navigation.navigate('ActivityHistory');
              }}
            >
              <Ionicons name="time-outline" size={scale(22)} color="#94A3B8" />
              <Text style={styles.menuItemText}>Lịch sử nhập/xuất</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
              <Ionicons name="trash-outline" size={scale(22)} color="#EF4444" />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Xóa thực phẩm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F7F6',
  },
  content: {
    paddingBottom: 30,
  },
  heroWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  appChipText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  menuBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    height: 200,
    borderRadius: 28,
    backgroundColor: '#D8D6D1',
    marginBottom: -34,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  foodTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  foodCategory: {
    fontSize: 15,
    color: '#64748B',
  },
  totalWrap: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#F97316',
  },
  totalUnit: {
    fontSize: 18,
    color: '#F97316',
    fontWeight: '800',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  sectionBadge: {
    backgroundColor: '#FFEDD5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionBadgeText: {
    color: '#F97316',
    fontWeight: '800',
    fontSize: 12,
  },
  batchCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  batchCardHighlighted: {
    borderColor: '#FDBA74',
    backgroundColor: '#FFF7ED',
  },
  batchImage: {
    width: 92,
    height: 92,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 14,
  },
  batchContent: {
    flex: 1,
  },
  batchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  batchTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  priorityBadge: {
    backgroundColor: '#FB923C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priorityBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  batchExpiry: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  batchFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchRemainLabel: {
    color: '#64748B',
    fontSize: 14,
  },
  batchRemainValue: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: '900',
  },
  subsectionTitle: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  storageCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 2,
  },
  storageValue: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },
  consumeCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  consumeLabel: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '800',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
  },
  stepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  stepperBtnPrimary: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
  },
  stepperBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F97316',
    marginTop: -2,
  },
  stepperValue: {
    minWidth: 56,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
  },
  consumeButton: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 5,
  },
  consumeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.28)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 16,
  },
  menuCard: {
    width: 300,
    backgroundColor: '#FFF',
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  menuItemText: {
    fontSize: 18,
    color: '#334155',
    fontWeight: '700',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
});
