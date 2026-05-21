import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useResponsive } from '@/core/theme/responsive';

const ITEMS = [
  { id: '1', name: 'Bố Tèo', action: 'đã thêm', amount: '2kg Thịt Bò', time: 'Hôm nay, 14:30', color: '#22C55E' },
  { id: '2', name: 'Mẹ', action: 'đã dùng', amount: '0.5kg Cà chua', time: 'Hôm nay, 10:15', color: '#F97316' },
  { id: '3', name: 'Tèo', action: 'đã dùng', amount: '1 hộp Sữa chua', time: 'Hôm qua, 21:00', color: '#F97316' },
  { id: '4', name: 'Mẹ', action: 'đã thêm', amount: '5 bắp Ngô ngọt', time: 'Hôm qua, 17:45', color: '#22C55E' },
  { id: '5', name: 'Bố Tèo', action: 'đã dùng', amount: '1 túi Bánh mì', time: '2 ngày trước, 07:30', color: '#F97316' },
];

export const ActivityHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { scale } = useResponsive();

  useEffect(() => {
    const parent = navigation.getParent?.();
    parent?.setOptions({
      tabBarStyle: {
        height: scale(68),
        paddingBottom: scale(10),
        paddingTop: scale(8),
        borderTopColor: '#E2E8F0',
      },
    });
  }, [navigation, scale]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={scale(24)} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Lịch sử hoạt động</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={scale(22)} color="#334155" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {ITEMS.map((item, index) => (
          <View key={item.id} style={styles.timelineRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]}</Text>
              </View>
              {index < ITEMS.length - 1 && <View style={styles.line} />}
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemText}>
                <Text style={styles.itemName}>{item.name} </Text>
                <Text style={{ color: item.color, fontWeight: '800' }}>{item.action}</Text>
                <Text style={styles.itemName}> {item.amount}</Text>
              </Text>
              <Text style={styles.itemTime}>{item.time}</Text>
            </View>
          </View>
        ))}

        <View style={styles.loadingWrap}>
          <View style={styles.loadingDot} />
          <Text style={styles.loadingText}>ĐANG TẢI THÊM...</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F7F6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E8D9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  avatarWrap: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '900',
  },
  line: {
    width: 1.5,
    flex: 1,
    backgroundColor: '#CBD5E1',
    marginTop: 4,
  },
  itemContent: {
    flex: 1,
    paddingTop: 1,
  },
  itemText: {
    fontSize: 15,
    lineHeight: 22,
  },
  itemName: {
    color: '#0F172A',
    fontWeight: '800',
  },
  itemTime: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 13,
  },
  loadingWrap: {
    alignItems: 'center',
    marginTop: 30,
  },
  loadingDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FDBA74',
    marginBottom: 8,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
