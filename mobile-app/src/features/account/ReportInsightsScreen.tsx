import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '@/core/theme/responsive';
import {
  reportApi,
  ReportPeriod,
  ReportInsightsResponse,
  MealTypePoint,
  CategoryWastePoint,
  ExpiryRiskItem,
} from './reportApi';
import { LoadingIndicator } from '@/core/base_widgets/LoadingIndicator';
import { ErrorDisplay } from '@/core/base_widgets/ErrorDisplay';

const PERIOD_OPTIONS: { label: string; value: ReportPeriod }[] = [
  { label: 'Tuần', value: 'WEEK' },
  { label: 'Tháng', value: 'MONTH' },
  { label: 'Năm', value: 'YEAR' },
];

const mealTypeLabel = (raw: string): string => {
  switch (raw?.toUpperCase()) {
    case 'BREAKFAST':
      return 'Bữa sáng';
    case 'LUNCH':
      return 'Bữa trưa';
    case 'DINNER':
      return 'Bữa tối';
    default:
      return raw || 'Khác';
  }
};

const riskLabel = (raw: string): string => {
  switch (raw) {
    case 'EXPIRED':
      return 'Đã hết hạn';
    case 'EXPIRING_SOON':
      return 'Sắp hết hạn';
    default:
      return 'Sắp tới hạn';
  }
};

const riskColor = (raw: string): string => {
  switch (raw) {
    case 'EXPIRED':
      return '#B91C1C';
    case 'EXPIRING_SOON':
      return '#D97706';
    default:
      return '#0F766E';
  }
};

const mealBarColor = (index: number): string => {
  const colors = ['#0F766E', '#0284C7', '#7C3AED', '#E11D48'];
  return colors[index % colors.length];
};

const ExpiryCard: React.FC<{ item: ExpiryRiskItem }> = ({ item }) => (
  <View style={styles.expiryCard}>
    <View style={styles.expiryHeader}>
      <Text style={styles.expiryName}>{item.foodName}</Text>
      <Text style={[styles.expiryStatus, { color: riskColor(item.riskLevel) }]}>{riskLabel(item.riskLevel)}</Text>
    </View>
    <Text style={styles.expiryMeta}>
      Còn lại {item.quantity.toFixed(2)} {item.unit}
    </Text>
    <Text style={styles.expiryMeta}>
      Hết hạn: {item.expirationDate} ({item.daysToExpire >= 0 ? `còn ${item.daysToExpire} ngày` : `quá hạn ${Math.abs(item.daysToExpire)} ngày`})
    </Text>
  </View>
);

const MealTypeBars: React.FC<{ points: MealTypePoint[] }> = ({ points }) => {
  const max = points.reduce((m, p) => Math.max(m, p.count), 0);

  return (
    <View style={styles.barGroup}>
      {points.map((point, index) => (
        <View key={`${point.mealType}-${index}`} style={styles.barRow}>
          <View style={styles.barLabelWrap}>
            <Text style={styles.barLabel}>{mealTypeLabel(point.mealType)}</Text>
            <Text style={styles.barValue}>{point.count} bữa</Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${max <= 0 ? 0 : (point.count / max) * 100}%`,
                  backgroundColor: mealBarColor(index),
                },
              ]}
            />
          </View>
        </View>
      ))}
      {points.length === 0 ? <Text style={styles.emptyText}>Chưa có dữ liệu bữa ăn.</Text> : null}
    </View>
  );
};

const WasteCategoryChart: React.FC<{ points: CategoryWastePoint[] }> = ({ points }) => (
  <View style={styles.categoryWrap}>
    {points.map((point, index) => (
      <View key={`${point.categoryName}-${index}`} style={styles.categoryRow}>
        <View style={styles.categoryLabelWrap}>
          <Text style={styles.categoryName}>{point.categoryName}</Text>
          <Text style={styles.categoryValue}>
            {point.quantity.toFixed(2)} {point.unit}
          </Text>
        </View>
        <View style={styles.categoryTrack}>
          <View
            style={[
              styles.categoryFill,
              { width: `${Math.max(0, Math.min(100, point.ratioPercent))}%` },
            ]}
          />
        </View>
      </View>
    ))}
    {points.length === 0 ? <Text style={styles.emptyText}>Không có dữ liệu lãng phí theo nhóm.</Text> : null}
  </View>
);

export const ReportInsightsScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { scale } = useResponsive();
  const [period, setPeriod] = React.useState<ReportPeriod>(route?.params?.period ?? 'WEEK');
  const [data, setData] = React.useState<ReportInsightsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportApi.getInsights(period);
      setData(response);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải báo cáo nâng cao.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingIndicator message="Đang tải báo cáo nâng cao..." color="#0F766E" />;
  }

  if (error) {
    return <ErrorDisplay title="Không tải được dữ liệu" message={error} onRetry={loadData} />;
  }

  if (!data) {
    return <ErrorDisplay title="Không có dữ liệu" message="Báo cáo nâng cao chưa sẵn sàng." onRetry={loadData} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={scale(20)} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Báo cáo nâng cao</Text>
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

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Phân bố bữa ăn</Text>
          <MealTypeBars points={data.mealTypeDistribution} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lãng phí theo nhóm thực phẩm</Text>
          <WasteCategoryChart points={data.wasteByCategory} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Nguy cơ hết hạn trong 14 ngày</Text>
          <View style={styles.expiryList}>
            {data.expiryRisk.map((item, index) => (
              <ExpiryCard key={`${item.foodName}-${item.expirationDate}-${index}`} item={item} />
            ))}
            {data.expiryRisk.length === 0 ? (
              <Text style={styles.emptyText}>Không có thực phẩm nào gần hết hạn.</Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EEF3F8' },
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#1F2937' },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  periodChip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  periodChipActive: { backgroundColor: '#0F766E', borderColor: '#0F766E' },
  periodChipText: { color: '#4B5563', fontSize: 13, fontWeight: '600' },
  periodChipTextActive: { color: '#FFFFFF' },
  sectionCard: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E1EB',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  barGroup: { gap: 10 },
  barRow: { gap: 6 },
  barLabelWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barLabel: { fontSize: 13, color: '#334155', fontWeight: '700' },
  barValue: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  barTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 999 },
  categoryWrap: { gap: 10 },
  categoryRow: { gap: 6 },
  categoryLabelWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryName: { fontSize: 13, color: '#334155', fontWeight: '700' },
  categoryValue: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  categoryTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#EF4444',
  },
  expiryList: { gap: 8 },
  expiryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 10,
  },
  expiryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  expiryName: { fontSize: 14, fontWeight: '800', color: '#111827', flex: 1, marginRight: 8 },
  expiryStatus: { fontSize: 12, fontWeight: '800' },
  expiryMeta: { marginTop: 2, fontSize: 12, color: '#64748B', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 10 },
});
