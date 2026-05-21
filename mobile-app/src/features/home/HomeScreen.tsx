import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppHeader } from '@/core/base_widgets';
import { useResponsive } from '@/core/theme/responsive';
import { householdApi, HouseholdOverviewResponse } from '@/features/account/api';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/authSlice';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { scale } = useResponsive();
  const currentUser = useAppSelector(selectUser);
  const [overview, setOverview] = useState<HouseholdOverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const displayName = useMemo(() => {
    if (currentUser?.name?.trim()) {
      return currentUser.name.trim();
    }
    if (currentUser?.email?.trim()) {
      return currentUser.email.split('@')[0];
    }
    return 'Người dùng';
  }, [currentUser?.email, currentUser?.name]);

  const avatarText = useMemo(() => {
    const cleaned = displayName.trim();
    if (!cleaned) {
      return 'ND';
    }
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
  }, [displayName]);

  const loadHomeData = useCallback(async () => {
    setOverviewError(null);
    setLoadingOverview(true);
    try {
      const response = await householdApi.getOverview();
      setOverview(response);
    } catch (error: any) {
      setOverviewError(error?.message || 'Không thể tải dữ liệu trang chủ.');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppHeader />

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.hello}>Xin chào,</Text>
            <Text style={styles.name}>{displayName} 👋</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>{avatarText}</Text></View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroChip}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={scale(16)} color="#F97316" />
            <Text style={styles.heroChipText}>SMART FOOD</Text>
          </View>
          <Text style={styles.heroTitle}>
            {overview?.household?.name ? `${overview.household.name}` : 'Quản lý bếp gia đình thông minh'}
          </Text>
          <Text style={styles.heroSub}>
            {loadingOverview
              ? 'Đang tải dữ liệu bếp...'
              : overviewError
                ? overviewError
                : `Thành viên: ${overview?.members?.length ?? 0} • Mã mời: ${overview?.invite?.code ?? 'N/A'}`}
          </Text>
          <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.navigate('Inventory')}>
            <Text style={styles.heroBtnText}>Vào Kho hàng</Text>
            <Ionicons name="arrow-forward" size={scale(18)} color="#FFF" />
          </TouchableOpacity>
        </View>

        {!!overviewError && (
          <TouchableOpacity style={styles.retryBtn} onPress={loadHomeData}>
            <Text style={styles.retryBtnText}>Thử tải lại</Text>
          </TouchableOpacity>
        )}

        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Inventory')}>
            <Ionicons name="albums-outline" size={scale(24)} color="#F97316" />
            <Text style={styles.quickTitle}>Kho hàng</Text>
            <Text style={styles.quickSub}>Xem thực phẩm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('Recipes')}>
            <Ionicons name="book-outline" size={scale(24)} color="#3B82F6" />
            <Text style={styles.quickTitle}>Công thức</Text>
            <Text style={styles.quickSub}>Gợi ý món ăn</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  hello: { fontSize: 14, color: '#64748B', fontWeight: '700' },
  name: { fontSize: 28, color: '#0F172A', fontWeight: '900', marginTop: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '900' },
  heroCard: { backgroundColor: '#0F172A', borderRadius: 28, padding: 20, marginBottom: 18 },
  heroChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 16, gap: 6 },
  heroChipText: { fontSize: 12, fontWeight: '900', color: '#334155', letterSpacing: 0.6 },
  heroTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 10 },
  heroSub: { color: '#94A3B8', fontSize: 14, lineHeight: 20, marginBottom: 18 },
  heroBtn: { height: 50, borderRadius: 16, backgroundColor: '#F97316', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  retryBtn: {
    marginBottom: 14,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  retryBtnText: { color: '#C2410C', fontWeight: '700', fontSize: 13 },
  quickGrid: { flexDirection: 'row', gap: 12 },
  quickCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  quickTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginTop: 12, marginBottom: 4 },
  quickSub: { color: '#64748B', fontSize: 13 },
});
