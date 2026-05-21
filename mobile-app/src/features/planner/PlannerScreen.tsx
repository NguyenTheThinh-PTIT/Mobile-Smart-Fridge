import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppHeader } from '@/core/base_widgets';
import { useResponsive } from '@/core/theme/responsive';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/authSlice';
import { MealPlan, plannerApi } from './api';

type PlannerViewMode = 'month' | 'week' | 'day';
type MealSlot = 'breakfast' | 'lunch' | 'dinner';

type CalendarCell = {
  day: number;
  monthOffset: -1 | 0 | 1;
  date: Date;
  mealCount: number;
};

type MealSlotConfig = {
  key: MealSlot;
  title: string;
  defaultHour: number;
  defaultMinute: number;
};

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const MONTH_LABELS = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

const DAY_LABELS_VI = ['Chủ nhật', 'thứ 2', 'thứ 3', 'thứ 4', 'thứ 5', 'thứ 6', 'thứ 7'];

const MEAL_SLOTS: MealSlotConfig[] = [
  { key: 'breakfast', title: 'Bữa sáng', defaultHour: 7, defaultMinute: 30 },
  { key: 'lunch', title: 'Bữa trưa', defaultHour: 12, defaultMinute: 30 },
  { key: 'dinner', title: 'Bữa tối', defaultHour: 19, defaultMinute: 0 },
];

const isSameDate = (first: Date, second: Date): boolean =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const dateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseIsoDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const formatTimeLabel = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const normalizeMealType = (mealType?: string | null): MealSlot | null => {
  if (!mealType) {
    return null;
  }

  const normalized = mealType.trim().toLowerCase();
  if (normalized.includes('breakfast') || normalized.includes('sáng')) {
    return 'breakfast';
  }
  if (normalized.includes('lunch') || normalized.includes('trưa')) {
    return 'lunch';
  }
  if (normalized.includes('dinner') || normalized.includes('tối')) {
    return 'dinner';
  }
  return null;
};

const getMonthOffset = (date: Date, monthDate: Date): -1 | 0 | 1 => {
  if (
    date.getFullYear() < monthDate.getFullYear() ||
    (date.getFullYear() === monthDate.getFullYear() && date.getMonth() < monthDate.getMonth())
  ) {
    return -1;
  }
  if (
    date.getFullYear() > monthDate.getFullYear() ||
    (date.getFullYear() === monthDate.getFullYear() && date.getMonth() > monthDate.getMonth())
  ) {
    return 1;
  }
  return 0;
};

const buildCalendarCell = (
  date: Date,
  monthDate: Date,
  mealCountByDate: Map<string, number>
): CalendarCell => ({
  day: date.getDate(),
  monthOffset: getMonthOffset(date, monthDate),
  date,
  mealCount: mealCountByDate.get(dateKey(date)) ?? 0,
});

const createMonthCells = (monthDate: Date, mealCountByDate: Map<string, number>): CalendarCell[] => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstWeekDay = firstDay.getDay();
  const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 - firstWeekDay);

  return Array.from({ length: 35 }, (_, index) => {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + index);
    return buildCalendarCell(cellDate, monthDate, mealCountByDate);
  });
};

const createWeekCells = (
  selectedDate: Date,
  monthDate: Date,
  mealCountByDate: Map<string, number>
): CalendarCell[] => {
  const weekStart = new Date(selectedDate);
  weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const cellDate = new Date(weekStart);
    cellDate.setDate(weekStart.getDate() + index);
    return buildCalendarCell(cellDate, monthDate, mealCountByDate);
  });
};

export const PlannerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useAppSelector(selectUser);
  const { scale } = useResponsive();
  const styles = React.useMemo(() => createStyles(scale), [scale]);

  const today = React.useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = React.useState(today);
  const [currentMonth, setCurrentMonth] = React.useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [viewMode, setViewMode] = React.useState<PlannerViewMode>('month');
  const [mealPlans, setMealPlans] = React.useState<MealPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const userId = React.useMemo(() => {
    if (!user?.id) {
      return null;
    }
    const parsedId = Number(user.id);
    if (Number.isNaN(parsedId)) {
      return null;
    }
    return parsedId;
  }, [user?.id]);

  const loadMealPlans = React.useCallback(async () => {
    if (!userId) {
      setLoadError('Không tìm thấy người dùng để tải lịch nấu ăn.');
      setMealPlans([]);
      return;
    }

    setLoadingPlans(true);
    setLoadError(null);

    try {
      const response = await plannerApi.getMealPlansByUser(userId);
      setMealPlans(response);
    } catch (error: any) {
      setLoadError(error?.message ?? 'Không thể tải lịch nấu ăn.');
    } finally {
      setLoadingPlans(false);
    }
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      loadMealPlans();
    }, [loadMealPlans])
  );

  const mealCountByDate = React.useMemo(() => {
    const countMap = new Map<string, number>();

    mealPlans.forEach((plan) => {
      const plannedDate = parseIsoDate(plan.plannedDate);
      if (!plannedDate) {
        return;
      }

      const key = dateKey(plannedDate);
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    });

    return countMap;
  }, [mealPlans]);

  const mealPlanBySlot = React.useMemo(() => {
    const selectedKey = dateKey(selectedDate);
    const slotMap = new Map<MealSlot, MealPlan>();

    mealPlans.forEach((plan) => {
      const plannedDate = parseIsoDate(plan.plannedDate);
      if (!plannedDate || dateKey(plannedDate) !== selectedKey) {
        return;
      }

      const slot = normalizeMealType(plan.mealType);
      if (!slot || slotMap.has(slot)) {
        return;
      }

      slotMap.set(slot, plan);
    });

    return slotMap;
  }, [mealPlans, selectedDate]);

  const calendarCells = React.useMemo(() => {
    if (viewMode === 'week') {
      return createWeekCells(selectedDate, currentMonth, mealCountByDate);
    }

    if (viewMode === 'day') {
      return [buildCalendarCell(selectedDate, currentMonth, mealCountByDate)];
    }

    return createMonthCells(currentMonth, mealCountByDate);
  }, [currentMonth, mealCountByDate, selectedDate, viewMode]);

  const monthLabel = MONTH_LABELS[currentMonth.getMonth()];
  const yearLabel = String(currentMonth.getFullYear());
  const todaySentence = `Hôm nay là ${DAY_LABELS_VI[today.getDay()]} ngày ${String(today.getDate()).padStart(
    2,
    '0'
  )} tháng ${String(today.getMonth() + 1).padStart(2, '0')}`;

  const selectedDateTitle = `${String(selectedDate.getDate()).padStart(2, '0')}/${String(
    selectedDate.getMonth() + 1
  ).padStart(2, '0')}/${selectedDate.getFullYear()}${isSameDate(selectedDate, today) ? ' - Hôm nay' : ''}`;

  const shiftSelectedDate = React.useCallback(
    (direction: 1 | -1) => {
      setSelectedDate((previous) => {
        const nextDate = new Date(previous);

        if (viewMode === 'month') {
          nextDate.setMonth(nextDate.getMonth() + direction);
        } else if (viewMode === 'week') {
          nextDate.setDate(nextDate.getDate() + direction * 7);
        } else {
          nextDate.setDate(nextDate.getDate() + direction);
        }

        setCurrentMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
        return nextDate;
      });
    },
    [viewMode]
  );

  const modeOptions = React.useMemo(
    () => [
      { mode: 'month' as PlannerViewMode, label: monthLabel },
      { mode: 'week' as PlannerViewMode, label: 'Tuần' },
      { mode: 'day' as PlannerViewMode, label: 'Ngày' },
    ],
    [monthLabel]
  );

  const showWeekHeader = viewMode !== 'day';

  const dayCellModeStyle = React.useMemo(() => {
    if (viewMode === 'day') {
      return styles.dayCellDayMode;
    }

    return null;
  }, [styles.dayCellDayMode, viewMode]);

  const resolveMealMoment = React.useCallback(
    (plan: MealPlan | undefined, slotConfig: MealSlotConfig): Date => {
      const plannedDate = parseIsoDate(plan?.plannedDate);
      if (plannedDate) {
        return plannedDate;
      }

      const fallback = new Date(selectedDate);
      fallback.setHours(slotConfig.defaultHour, slotConfig.defaultMinute, 0, 0);
      return fallback;
    },
    [selectedDate]
  );

  const now = new Date();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader marginBottom={scale(16)} />

        <Text style={styles.yearText}>{yearLabel}</Text>
        <Text style={styles.todayText}>{todaySentence}</Text>

        <View style={styles.monthNavWrap}>
          <View style={styles.monthNavContent}>
            <TouchableOpacity style={styles.arrowButton} activeOpacity={0.85} onPress={() => shiftSelectedDate(-1)}>
              <Ionicons name="chevron-back" size={scale(16)} color="#4B5563" />
            </TouchableOpacity>

            <View style={styles.modeTabs}>
              {modeOptions.map((item) => {
                const isActiveMode = item.mode === viewMode;

                return (
                  <TouchableOpacity
                    key={item.mode}
                    activeOpacity={0.85}
                    style={isActiveMode ? styles.activeModeTab : styles.inactiveModeTab}
                    onPress={() => setViewMode(item.mode)}
                  >
                    <Text style={isActiveMode ? styles.activeModeText : styles.inactiveModeText}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.arrowButton} activeOpacity={0.85} onPress={() => shiftSelectedDate(1)}>
              <Ionicons name="chevron-forward" size={scale(16)} color="#4B5563" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.calendarWrap}>
          {showWeekHeader ? (
            <View style={styles.weekRow}>
              {WEEKDAYS.map((label) => (
                <View key={label} style={styles.weekDayCell}>
                  <Text style={styles.weekDayText}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.calendarGrid}>
            {calendarCells.map((cell, index) => {
              const isSelected = isSameDate(cell.date, selectedDate);
              const isFaded = cell.monthOffset !== 0;

              return (
                <TouchableOpacity
                  key={`${cell.monthOffset}-${cell.day}-${index}`}
                  style={[styles.dayCell, dayCellModeStyle]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedDate(cell.date);
                    setCurrentMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                  }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isFaded && styles.dayTextFaded,
                    ]}
                  >
                    {cell.day}
                  </Text>

                  {cell.mealCount > 0 ? (
                    <View style={styles.dotRow}>
                      {Array.from({ length: Math.min(cell.mealCount, 3) }, (_, dotIndex) => (
                        <View key={`${dotIndex}`} style={styles.eventDot} />
                      ))}
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.scheduleSection}>
          <Text style={styles.scheduleTitle}>{selectedDateTitle}</Text>

          {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
          {loadingPlans ? <Text style={styles.loadingText}>Đang tải lịch bữa ăn...</Text> : null}

          {MEAL_SLOTS.map((slot) => {
            const mealPlan = mealPlanBySlot.get(slot.key);
            const mealMoment = resolveMealMoment(mealPlan, slot);
            const isPastMeal = mealMoment.getTime() < now.getTime();

            const subtitle = isPastMeal
              ? mealPlan
                ? `Đã qua bữa - đã lên lịch lúc ${formatTimeLabel(mealMoment)}`
                : 'Đã qua bữa - chưa ghi nhận lên kế hoạch'
              : mealPlan
                ? formatTimeLabel(mealMoment)
                : 'Chưa lên kế hoạch';

            const iconName = isPastMeal
              ? 'lock-closed-outline'
              : mealPlan
                ? 'create-outline'
                : 'add';

            const onPressMealCard = () => {
              if (isPastMeal) {
                return;
              }

              const params = {
                mealType: slot.title,
                mealTypeKey: slot.key,
                date: selectedDateTitle,
                selectedDateIso: selectedDate.toISOString(),
                state: mealPlan ? 'edit' : 'create',
                mealPlan,
                selectedRecipes: null,
              };

              navigation.navigate('MealPlanPending', params);
            };

            const mealCardStyle = isPastMeal
              ? styles.mealCardPast
              : mealPlan
                ? styles.mealCardPlanned
                : styles.mealCardPending;

            return (
              <TouchableOpacity
                key={slot.key}
                activeOpacity={isPastMeal ? 1 : 0.85}
                style={[
                  styles.mealCard,
                  mealCardStyle,
                  isPastMeal ? styles.mealCardDisabled : null,
                ]}
                onPress={onPressMealCard}
                disabled={isPastMeal}
              >
                <View>
                  <Text style={styles.mealName}>{slot.title}</Text>
                  <Text style={styles.mealSubText}>{subtitle}</Text>
                </View>

                <View style={isPastMeal ? styles.disabledActionCircle : styles.actionCircle}>
                  <Ionicons
                    name={iconName}
                    size={scale(18)}
                    color={isPastMeal ? '#94A3B8' : '#FFFFFF'}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (scale: (size: number) => number) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    content: {
      paddingHorizontal: scale(24),
      paddingTop: scale(16),
      paddingBottom: scale(24),
    },
    yearText: {
      textAlign: 'center',
      fontSize: scale(30),
      lineHeight: scale(36),
      fontWeight: '700',
      color: '#181C2E',
      marginTop: scale(2),
    },
    todayText: {
      textAlign: 'center',
      fontSize: scale(14),
      lineHeight: scale(20),
      color: '#181C2E',
      marginTop: scale(8),
      marginBottom: scale(14),
    },
    monthNavWrap: {
      marginHorizontal: scale(-24),
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
      paddingHorizontal: scale(24),
      paddingVertical: scale(16),
    },
    monthNavContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    arrowButton: {
      width: scale(48),
      height: scale(48),
      borderRadius: scale(24),
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeTabs: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: scale(210),
      height: scale(36),
      gap: scale(6),
    },
    activeModeTab: {
      height: scale(36),
      borderRadius: scale(999),
      backgroundColor: '#FFD27C',
      paddingHorizontal: scale(16),
      alignItems: 'center',
      justifyContent: 'center',
    },
    inactiveModeTab: {
      height: scale(36),
      borderRadius: scale(999),
      backgroundColor: '#FFFFFF',
      paddingHorizontal: scale(12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeModeText: {
      fontSize: scale(12),
      lineHeight: scale(18),
      fontWeight: '500',
      color: '#181C2E',
    },
    inactiveModeText: {
      fontSize: scale(12),
      lineHeight: scale(18),
      fontWeight: '500',
      color: '#6B7280',
    },
    calendarWrap: {
      marginHorizontal: scale(-24),
      paddingHorizontal: scale(24),
      paddingTop: scale(16),
      paddingBottom: scale(12),
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: scale(14),
    },
    weekDayCell: {
      width: `${100 / 7}%`,
      alignItems: 'center',
      justifyContent: 'center',
      height: scale(32),
    },
    weekDayText: {
      fontSize: scale(12),
      lineHeight: scale(15),
      fontWeight: '600',
      color: '#6B7280',
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: `${100 / 7}%`,
      height: scale(48),
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      borderRadius: scale(8),
    },
    dayCellDayMode: {
      width: '100%',
      height: scale(64),
      borderWidth: 1,
      borderColor: '#F3F4F6',
      borderRadius: scale(12),
      marginBottom: scale(4),
    },
    dayText: {
      fontSize: scale(14),
      lineHeight: scale(17),
      color: '#111827',
      fontWeight: '500',
    },
    dayTextSelected: {
      fontSize: scale(16),
      lineHeight: scale(19),
      fontWeight: '700',
      color: '#181C2E',
    },
    dayTextFaded: {
      color: '#9CA3AF',
      fontWeight: '400',
    },
    dotRow: {
      position: 'absolute',
      bottom: scale(6),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(3),
    },
    eventDot: {
      width: scale(4),
      height: scale(4),
      borderRadius: scale(2),
      backgroundColor: '#EAB308',
    },
    scheduleSection: {
      paddingTop: scale(16),
    },
    scheduleTitle: {
      fontSize: scale(18),
      lineHeight: scale(28),
      fontWeight: '700',
      color: '#111827',
      marginBottom: scale(12),
    },
    loadingText: {
      fontSize: scale(13),
      color: '#64748B',
      marginBottom: scale(10),
    },
    errorText: {
      fontSize: scale(13),
      color: '#B91C1C',
      marginBottom: scale(10),
      fontWeight: '600',
    },
    mealCard: {
      height: scale(70),
      borderRadius: scale(16),
      borderWidth: 1,
      paddingHorizontal: scale(17),
      marginBottom: scale(12),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    mealCardPast: {
      backgroundColor: '#F2F2F2',
      opacity: 0.9,
      borderColor: '#DBEAFE',
    },
    mealCardPlanned: {
      backgroundColor: '#FFFFFF',
      borderColor: '#FEE2E2',
    },
    mealCardPending: {
      backgroundColor: '#FFD27C',
      borderColor: '#DCFCE7',
    },
    mealCardDisabled: {
      opacity: 0.6,
    },
    mealName: {
      fontSize: scale(14),
      lineHeight: scale(20),
      fontWeight: '600',
      color: '#111827',
    },
    mealSubText: {
      marginTop: scale(1),
      fontSize: scale(12),
      lineHeight: scale(16),
      fontWeight: '400',
      color: '#4B5563',
      maxWidth: scale(220),
    },
    actionCircle: {
      width: scale(24),
      height: scale(24),
      borderRadius: scale(12),
      backgroundColor: '#FF7622',
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabledActionCircle: {
      width: scale(24),
      height: scale(24),
      borderRadius: scale(12),
      backgroundColor: '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });