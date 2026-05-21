import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '@/core/theme/responsive';
import {
  reportApi,
  ReportPeriod,
  CookingHistoryItem,
} from './reportApi';
import { LoadingIndicator } from '@/core/base_widgets/LoadingIndicator';
import { ErrorDisplay } from '@/core/base_widgets/ErrorDisplay';

const PERIOD_OPTIONS: { label: string; value: ReportPeriod }[] = [
  { label: 'Tuần', value: 'WEEK' },
  { label: 'Tháng', value: 'MONTH' },
  { label: 'Năm', value: 'YEAR' },
];

const formatSchedule = (raw: string): string => {
  if (!raw) {
    return 'Chưa có thời gian';
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
};

export const ReportCookingHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { scale } = useResponsive();
  const [period, setPeriod] = React.useState<ReportPeriod>('WEEK');
  const [items, setItems] = React.useState<CookingHistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportApi.getCookingHistory(period);
      setItems(response.items);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải lịch sử nấu ăn.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingIndicator message="Đang tải lịch sử nấu ăn..." color="#F97316" />;
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
          <Text style={styles.headerTitle}>Lịch sử nấu ăn</Text>
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

        <View style={styles.listWrap}>
          {items.map((item) => (
            <View key={`${item.dishId}-${item.scheduledAt}`} style={styles.card}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imageFallback]}>
                  <Ionicons name="restaurant-outline" size={scale(22)} color="#FFFFFF" />
                </View>
              )}

              <View style={styles.cardBody}>
                <Text style={styles.name}>{item.dishName}</Text>
                <Text style={styles.ingredients} numberOfLines={1}>
                  {item.ingredients || 'Đang cập nhật nguyên liệu'}
                </Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="star" size={scale(14)} color="#F97316" />
                    <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={scale(14)} color="#F97316" />
                    <Text style={styles.metaText}>{item.cookMinutes} min</Text>
                  </View>
                </View>

                <Text style={styles.schedule}>{formatSchedule(item.scheduledAt)}</Text>
              </View>
            </View>
          ))}

          {items.length === 0 ? (
            <Text style={styles.emptyText}>Không có dữ liệu lịch sử nấu ăn trong khoảng này.</Text>
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 21, fontWeight: '800', color: '#1F2937' },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
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
  listWrap: { gap: 12 },
  card: { borderRadius: 16, backgroundColor: '#F8FAFC', overflow: 'hidden' },
  image: { width: '100%', height: 132 },
  imageFallback: { backgroundColor: '#94A3B8', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 12 },
  name: { fontSize: 30, fontWeight: '800', color: '#1F2937' },
  ingredients: { marginTop: 2, fontSize: 13, color: '#22C55E', fontWeight: '600' },
  metaRow: { marginTop: 8, flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#111827', fontWeight: '700' },
  schedule: { marginTop: 4, color: '#6B7280', fontSize: 12 },
  emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 20 },
});
