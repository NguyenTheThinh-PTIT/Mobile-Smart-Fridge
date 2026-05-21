import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '@/core/theme/responsive';
import { reportApi, ReportPeriod, FoodStatItem } from './reportApi';
import { LoadingIndicator } from '@/core/base_widgets/LoadingIndicator';
import { ErrorDisplay } from '@/core/base_widgets/ErrorDisplay';

const PERIOD_OPTIONS: { label: string; value: ReportPeriod }[] = [
  { label: 'Tuần', value: 'WEEK' },
  { label: 'Tháng', value: 'MONTH' },
  { label: 'Năm', value: 'YEAR' },
];

export const ReportFoodListScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { scale } = useResponsive();
  const mode: 'consumed' | 'wasted' = route?.params?.mode === 'wasted' ? 'wasted' : 'consumed';
  const title = mode === 'consumed' ? 'Thực phẩm tiêu thụ' : 'Thực phẩm lãng phí';
  const ratioLabel = mode === 'consumed' ? 'Tỉ trọng tiêu thụ' : 'Tỉ trọng lãng phí';

  const [period, setPeriod] = React.useState<ReportPeriod>('WEEK');
  const [query, setQuery] = React.useState('');
  const [items, setItems] = React.useState<FoodStatItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (mode === 'wasted') {
        const response = await reportApi.getWastedFoods(period, query);
        setItems(response.items);
      } else {
        const response = await reportApi.getConsumedFoods(period, query);
        setItems(response.items);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [mode, period, query]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  if (loading) {
    return <LoadingIndicator message="Đang tải danh sách thực phẩm..." color="#F97316" />;
  }

  if (error) {
    return <ErrorDisplay title="Không tải được dữ liệu" message={error} onRetry={loadData} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={scale(20)} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerIconBtn} />
        </View>

        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setPeriod(option.value)}
              style={[styles.periodChip, period === option.value && styles.periodChipActive]}
            >
              <Text style={[styles.periodChipText, period === option.value && styles.periodChipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={scale(18)} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm thực phẩm"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={scale(18)} color="#C4C4C4" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.listWrap}>
          {items.map((item) => (
            <View key={`${item.name}-${item.unit}`} style={styles.rowCard}>
              <Text style={styles.rowName}>{item.name.toUpperCase()}</Text>
              <Text style={styles.rowSub}>Số lượng: {item.quantity.toFixed(2)} {item.unit}</Text>
              <Text style={styles.rowSub}>Lần sử dụng: {item.occurrenceCount}</Text>
              <Text style={styles.rowSub}>{ratioLabel}: {item.ratioPercent.toFixed(1)}%</Text>
              <View style={styles.ratioTrack}>
                <View style={[styles.ratioFill, { width: `${Math.min(100, Math.max(0, item.ratioPercent))}%` }]} />
              </View>
            </View>
          ))}

          {items.length === 0 ? (
            <Text style={styles.emptyText}>Không có dữ liệu phù hợp.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 14, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8ECF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '800', color: '#1F2937' },
  searchWrap: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: { flex: 1, color: '#111827', fontSize: 14 },
  periodRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 },
  periodChip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  periodChipActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  periodChipText: { color: '#4B5563', fontWeight: '600' },
  periodChipTextActive: { color: '#FFFFFF' },
  listWrap: { gap: 10 },
  rowCard: {
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#DCE4EE',
    padding: 12,
  },
  rowName: { fontSize: 14, fontWeight: '800', color: '#374151' },
  rowSub: { marginTop: 2, fontSize: 13, color: '#6B7280' },
  ratioTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  ratioFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#0F766E',
  },
  emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 20 },
});
