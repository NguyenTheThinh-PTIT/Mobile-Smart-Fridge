import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '@/core/theme/responsive';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/authSlice';
import { LoadingIndicator } from '@/core/base_widgets/LoadingIndicator';
import { AppNotification, notificationsApi } from './notificationsApi';
import { MealPlan, MealType, plannerApi } from '@/features/planner/api';

type NotificationMetadata = {
  foodId?: number | string;
  food_id?: number | string;
  ingredientId?: number | string;
  ingredient_id?: number | string;
  itemId?: number | string;
  item_id?: number | string;
  mealId?: number | string;
  meal_id?: number | string;
  relatedMealId?: number | string;
  related_meal_id?: number | string;
};

const toMealTypeKey = (value?: string | null): MealType => {
  const normalized = (value ?? '').toLowerCase();
  if (normalized.includes('breakfast') || normalized.includes('sáng')) {
    return 'breakfast';
  }
  if (normalized.includes('lunch') || normalized.includes('trưa')) {
    return 'lunch';
  }
  return 'dinner';
};

const normalizeFoodId = (metadata: NotificationMetadata | null): string | null => {
  if (!metadata) {
    return null;
  }

  const candidate =
    metadata.foodId ??
    metadata.food_id ??
    metadata.ingredientId ??
    metadata.ingredient_id ??
    metadata.itemId ??
    metadata.item_id;
  if (candidate === undefined || candidate === null) {
    return null;
  }

  const normalized = String(candidate).trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveRelatedMealId = (item: AppNotification): number | null => {
  const metadata = parseNotificationMetadata(item.metadata);
  const candidate =
    item.relatedMealId ??
    metadata?.relatedMealId ??
    metadata?.related_meal_id ??
    metadata?.mealId ??
    metadata?.meal_id;

  const parsed = Number(candidate ?? 0);
  if (!parsed) {
    return null;
  }

  return parsed;
};

const parseNotificationMetadata = (metadata?: string | null): NotificationMetadata | null => {
  if (!metadata || metadata.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadata) as NotificationMetadata;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const toSelectedDateIso = (plannedDate?: string | null): string | null => {
  if (!plannedDate) {
    return null;
  }

  const parsed = new Date(plannedDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const toMealTypeLabel = (value: MealType): string => {
  if (value === 'breakfast') {
    return 'Bữa sáng';
  }
  if (value === 'lunch') {
    return 'Bữa trưa';
  }
  return 'Bữa tối';
};

export const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { scale } = useResponsive();
  const user = useAppSelector(selectUser);
  const userId = React.useMemo(() => Number(user?.id || 0), [user?.id]);

  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actioningId, setActioningId] = React.useState<number | null>(null);

  const loadNotifications = React.useCallback(async () => {
    if (!userId) {
      setError('Không xác định được người dùng.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await notificationsApi.getNotifications(userId);
      setNotifications(data);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải thông báo.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (item: AppNotification) => {
    if (!userId || item.isRead) {
      return;
    }

    setActioningId(item.id);
    try {
      await notificationsApi.markAsRead(userId, item.id);
      setNotifications((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, isRead: true } : row))
      );
    } catch {
      return;
    } finally {
      setActioningId(null);
    }
  };

  const onRespondMeal = async (item: AppNotification, willEat: boolean) => {
    if (!userId) {
      return;
    }

    setActioningId(item.id);
    try {
      await notificationsApi.respondMealAttendance(userId, item.id, willEat);
      await loadNotifications();
    } catch {
      return;
    } finally {
      setActioningId(null);
    }
  };

  const navigateToMealScheduling = async (item: AppNotification) => {
    if (!userId) {
      return;
    }

    const relatedMealId = resolveRelatedMealId(item);
    if (!relatedMealId) {
      const fallbackMealTypeKey = 'dinner' as MealType;
      navigation.navigate('MealPlanPending', {
        mealType: toMealTypeLabel(fallbackMealTypeKey),
        mealTypeKey: fallbackMealTypeKey,
        selectedDateIso: new Date().toISOString(),
      });
      return;
    }

    try {
      const mealPlan: MealPlan = await plannerApi.getMealPlanById(userId, relatedMealId);

      navigation.navigate('MealPlanPending', {
        mealType: mealPlan.mealType,
        mealTypeKey: toMealTypeKey(mealPlan.mealType),
        selectedDateIso: toSelectedDateIso(mealPlan.plannedDate),
        mealPlan,
      });
    } catch {
      const fallbackMealTypeKey = 'dinner' as MealType;
      navigation.navigate('MealPlanPending', {
        mealType: toMealTypeLabel(fallbackMealTypeKey),
        mealTypeKey: fallbackMealTypeKey,
        selectedDateIso: new Date().toISOString(),
      });
    }
  };

  const navigateToExpiringIngredient = (item: AppNotification) => {
    const metadata = parseNotificationMetadata(item.metadata);
    const foodId = normalizeFoodId(metadata);

    if (foodId) {
      navigation.navigate('Inventory', {
        screen: 'FoodDetail',
        params: { foodId },
      });
      return;
    }

    navigation.navigate('Inventory', { screen: 'FoodInventory' });
  };

  const handleNotificationPress = async (item: AppNotification) => {
    await markAsRead(item);

    if (item.type === 'shopping_reminder' || item.type === 'meal_starting_soon') {
      await navigateToMealScheduling(item);
      return;
    }

    if (item.type === 'ingredient_expiring') {
      navigateToExpiringIngredient(item);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ingredient_expiring':
        return 'alarm-outline';
      case 'member_joined':
        return 'people-outline';
      case 'shopping_reminder':
        return 'cart-outline';
      case 'meal_attendance_confirm':
        return 'restaurant-outline';
      case 'meal_attendance_broadcast':
        return 'megaphone-outline';
      case 'meal_starting_soon':
        return 'time-outline';
      default:
        return 'notifications-outline';
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')} ${String(
      parsed.getHours()
    ).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) {
    return <LoadingIndicator message="Đang tải thông báo..." color="#F97316" />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.headerRow, { paddingHorizontal: scale(16) }]}> 
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={scale(20)} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Thông báo</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={loadNotifications}>
          <Ionicons name="refresh-outline" size={scale(18)} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={[styles.card, { marginHorizontal: scale(16) }]}> 
          <Text style={styles.emptyTitle}>Không tải được thông báo</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.listWrap, { paddingHorizontal: scale(16) }]}>
          {notifications.length === 0 ? (
            <View style={styles.card}>
              <Ionicons name="notifications-outline" size={scale(24)} color="#EA8A22" />
              <Text style={styles.emptyTitle}>Chưa có thông báo mới</Text>
              <Text style={styles.emptyText}>
                Thông báo về nguyên liệu, thành viên, mua sắm và lịch ăn sẽ xuất hiện tại đây.
              </Text>
            </View>
          ) : (
            notifications.map((item) => {
              const disabledAction = actioningId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.notificationCard, !item.isRead ? styles.unreadCard : styles.readCard]}
                  activeOpacity={0.9}
                  onPress={() => handleNotificationPress(item)}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.iconBadge}>
                      <Ionicons name={getNotificationIcon(item.type)} size={scale(18)} color="#EA8A22" />
                    </View>

                    <View style={styles.cardTextWrap}>
                      <Text style={[styles.cardTitle, !item.isRead ? styles.cardTitleUnread : null]}>
                        {item.title}
                      </Text>
                      <Text style={styles.cardContent}>{item.content}</Text>
                      <Text style={styles.cardTime}>{formatDate(item.createdAt)}</Text>
                    </View>

                    {!item.isRead ? <View style={styles.unreadDot} /> : null}
                  </View>

                  {item.actionRequired && !item.actionTaken ? (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionButtonSecondary, disabledAction ? styles.actionDisabled : null]}
                        onPress={() => onRespondMeal(item, false)}
                        disabled={disabledAction}
                      >
                        <Text style={styles.actionButtonSecondaryText}>Không ăn</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButtonPrimary, disabledAction ? styles.actionDisabled : null]}
                        onPress={() => onRespondMeal(item, true)}
                        disabled={disabledAction}
                      >
                        <Text style={styles.actionButtonPrimaryText}>Xác nhận ăn</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F7F6' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginBottom: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  listWrap: {
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyText: {
    marginTop: 6,
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 22,
  },
  notificationCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  unreadCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  readCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF1E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardTextWrap: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '700',
  },
  cardTitleUnread: {
    color: '#9A3412',
  },
  cardContent: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  cardTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F97316',
    marginTop: 6,
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FDA4AF',
  },
  actionButtonSecondaryText: {
    color: '#BE123C',
    fontWeight: '700',
    fontSize: 12,
  },
  actionDisabled: {
    opacity: 0.6,
  },
});
