import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useResponsive } from '@/core/theme/responsive';
import {
  reportApi,
  ReportPeriod,
  ReportSummaryResponse,
  CookingHistoryItem,
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

const getBarHeight = (value: number, maxValue: number): number => {
  if (maxValue <= 0) {
    return 8;
  }
  return Math.max(8, Math.round((value / maxValue) * 72));
};

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

const formatClock = (raw: string): string => {
  if (!raw) {
    return 'Chưa có thời gian';
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleString('vi-VN', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

const HistoryCard: React.FC<{ item: CookingHistoryItem; scale: (size: number) => number }> = ({
  item,
  scale,
}) => (
  <View style={styles.historyCard}>
    {item.imageUrl ? (
      <Image source={{ uri: item.imageUrl }} style={styles.historyImage} />
    ) : (
      <View style={[styles.historyImage, styles.historyImageFallback]}>
        <Ionicons name="restaurant-outline" size={scale(20)} color="#FFFFFF" />
      </View>
    )}
    <View style={styles.historyContent}>
      <Text style={styles.historyTitle}>{item.dishName}</Text>
      <Text style={styles.historyIngredients} numberOfLines={1}>
        {item.ingredients || 'Đang cập nhật nguyên liệu'}
      </Text>
      <View style={styles.historyMetaRow}>
        <View style={styles.historyMetaItem}>
          <Ionicons name="star" size={scale(14)} color="#F97316" />
          <Text style={styles.historyMetaText}>{item.rating.toFixed(1)}</Text>
        </View>
        <View style={styles.historyMetaItem}>
          <Ionicons name="time-outline" size={scale(14)} color="#F97316" />
          <Text style={styles.historyMetaText}>{item.cookMinutes} min</Text>
        </View>
      </View>
      <Text style={styles.historySchedule}>{formatClock(item.scheduledAt)}</Text>
    </View>
  </View>
);

const WasteRateRing: React.FC<{ value: number }> = ({ value }) => {
  const size = 108;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.max(0, Math.min(value, 100));
  const dashOffset = circumference - (normalized / 100) * circumference;

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#EF4444"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringValue}>{normalized.toFixed(0)}%</Text>
        <Text style={styles.ringLabel}>Lãng phí</Text>
      </View>
    </View>
  );
};

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

export const ReportSummaryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { scale } = useResponsive();
  const [period, setPeriod] = React.useState<ReportPeriod>('WEEK');
  const [summary, setSummary] = React.useState<ReportSummaryResponse | null>(null);
  const [insights, setInsights] = React.useState<ReportInsightsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadSummary = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryData, insightsData] = await Promise.all([
        reportApi.getSummary(period),
        reportApi.getInsights(period),
      ]);
      setSummary(summaryData);
      setInsights(insightsData);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải báo cáo.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  React.useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (loading) {
    return <LoadingIndicator message="Đang tải báo cáo..." color="#F97316" />;
  }

  if (error) {
    return <ErrorDisplay title="Không tải được báo cáo" message={error} onRetry={loadSummary} />;
  }

  if (!summary) {
    return <ErrorDisplay title="Không có dữ liệu" message="Dữ liệu báo cáo chưa sẵn sàng." onRetry={loadSummary} />;
  }

  const peak = summary.cookingTrend.reduce((max, point) => Math.max(max, point.count), 0);
  const mealTypePoints: MealTypePoint[] = insights?.mealTypeDistribution ?? [];
  const wasteByCategory: CategoryWastePoint[] = insights?.wasteByCategory ?? [];
  const expiryRisk: ExpiryRiskItem[] = insights?.expiryRisk ?? [];
  const recentCookingHistory = summary.cookingHistory.slice(0, 2);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={scale(20)} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Báo cáo</Text>
          <TouchableOpacity
            style={styles.notificationWrap}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.85}
          >
            <View style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={scale(20)} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
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

        <View style={styles.metricRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.metricCard}
            onPress={() => navigation.navigate('ReportFoodList', { mode: 'consumed' })}
          >
            <Text style={styles.metricValue}>{String(summary.consumedCount).padStart(2, '0')}</Text>
            <Text style={styles.metricLabel}>Số lượng thực phẩm tiêu thụ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.metricCard}
            onPress={() => navigation.navigate('ReportFoodList', { mode: 'wasted' })}
          >
            <Text style={styles.metricValue}>{String(summary.wasteCount).padStart(2, '0')}</Text>
            <Text style={styles.metricLabel}>Lượt thực phẩm lãng phí</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.analyticsCard}>
          <View style={styles.analyticsHeader}>
            <Text style={styles.analyticsTitle}>Tỉ lệ lãng phí và xu hướng nấu ăn</Text>
          </View>

          <View style={styles.analyticsBody}>
            <WasteRateRing value={summary.wasteRatePercent} />

            <View style={styles.chartWrap}>
              {summary.cookingTrend.map((point) => (
                <View key={point.label} style={styles.chartColumn}>
                  <View style={styles.chartBarBg}>
                    <View
                      style={[
                        styles.chartBarFill,
                        { height: getBarHeight(point.count, peak) },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{point.label}</Text>
                  <Text style={styles.chartValue}>{point.count}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.sectionCardCompact}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Phân bố bữa ăn</Text>
          </View>
          <MealTypeBars points={mealTypePoints} />
        </View>

        <View style={styles.sectionCardCompact}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lãng phí theo nhóm thực phẩm</Text>
          </View>
          <WasteCategoryChart points={wasteByCategory} />
        </View>

        <View style={styles.sectionCardCompact}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nguy cơ hết hạn trong 14 ngày</Text>
          </View>
          <View style={styles.expiryList}>
            {expiryRisk.slice(0, 4).map((item, index) => (
              <ExpiryCard key={`${item.foodName}-${item.expirationDate}-${index}`} item={item} />
            ))}
            {expiryRisk.length === 0 ? <Text style={styles.emptyText}>Không có thực phẩm nào gần hết hạn.</Text> : null}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lịch sử nấu ăn gần đây</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ReportCookingHistory')}>
            <Text style={styles.sectionLink}>Xem chi tiết</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.historyList}>
          {recentCookingHistory.map((item) => (
            <HistoryCard key={`${item.dishId}-${item.scheduledAt}`} item={item} scale={scale} />
          ))}
          {recentCookingHistory.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có lịch sử nấu ăn trong khoảng thời gian này.</Text>
          ) : null}
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
  notificationWrap: {
    width: 45,
    height: 54,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  notificationButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#181C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#1F2937' },
  metricRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D8E1EB',
  },
  metricValue: { fontSize: 42, fontWeight: '900', color: '#111827', lineHeight: 44 },
  metricLabel: { marginTop: 4, color: '#475569', fontSize: 12, fontWeight: '700' },
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
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D8E1EB',
  },
  analyticsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  analyticsTitle: { fontSize: 14, color: '#334155', fontWeight: '700', flex: 1, marginRight: 8 },
  analyticsBody: { marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  ringWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringValue: { fontSize: 22, fontWeight: '900', color: '#991B1B' },
  ringLabel: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  chartWrap: {
    marginLeft: 8,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
  },
  chartColumn: { alignItems: 'center', flex: 1 },
  chartBarBg: {
    width: 16,
    height: 78,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: '#0F766E',
    borderRadius: 8,
  },
  chartLabel: { marginTop: 6, fontSize: 10, color: '#64748B', fontWeight: '700' },
  chartValue: { fontSize: 10, color: '#334155', fontWeight: '700' },
  sectionCardCompact: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D8E1EB',
  },
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, color: '#1F2937', fontWeight: '800' },
  sectionLink: { fontSize: 14, color: '#0F766E', fontWeight: '700' },
  historyList: { gap: 10 },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D8E1EB',
  },
  historyImage: { width: '100%', height: 112 },
  historyImageFallback: { backgroundColor: '#94A3B8', alignItems: 'center', justifyContent: 'center' },
  historyContent: { padding: 12 },
  historyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  historyIngredients: { marginTop: 2, fontSize: 13, color: '#0F766E', fontWeight: '600' },
  historyMetaRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  historyMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyMetaText: { fontSize: 13, color: '#1F2937', fontWeight: '700' },
  historySchedule: { marginTop: 4, fontSize: 12, color: '#6B7280' },
  emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 8 },
});
