import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/core/base_widgets';
import { useResponsive } from '@/core/theme/responsive';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/authSlice';
import { MealPlan, MealType, plannerApi } from './api';

interface SelectedRecipe {
  recipe_id: number;
  recipe_name: string;
  cook_time_minutes: number;
  calories_kcal?: number;
  difficulty?: string;
  warning_message?: string | null;
}

const META_PREFIX = 'SCHEDULE_META:';

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

const parseRecipesFromNotes = (notes?: string | null): SelectedRecipe[] => {
  if (!notes || !notes.startsWith(META_PREFIX)) {
    return [];
  }

  try {
    const payload = JSON.parse(notes.slice(META_PREFIX.length)) as { recipes?: SelectedRecipe[] };
    if (!Array.isArray(payload.recipes)) {
      return [];
    }

    return payload.recipes;
  } catch {
    return [];
  }
};

const buildNotes = (recipes: SelectedRecipe[]): string => {
  const compact = recipes.slice(0, 8).map((item) => ({
    recipe_id: item.recipe_id,
    recipe_name: item.recipe_name,
    cook_time_minutes: item.cook_time_minutes,
    calories_kcal: item.calories_kcal,
    difficulty: item.difficulty,
  }));

  return `${META_PREFIX}${JSON.stringify({ recipes: compact })}`;
};

const to12hState = (date: Date) => {
  const hour24 = date.getHours();
  const minute = date.getMinutes();
  const isPm = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return {
    hour: hour12,
    minute,
    meridiem: isPm ? ('PM' as const) : ('AM' as const),
  };
};

const to24hHour = (hour12: number, meridiem: 'AM' | 'PM'): number => {
  if (meridiem === 'AM') {
    return hour12 === 12 ? 0 : hour12;
  }

  return hour12 === 12 ? 12 : hour12 + 12;
};

const toLocalDateTimeString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const clampNumber = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
};

const normalizeHourInput = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  return clampNumber(parsed, 1, 12);
};

const normalizeMinuteInput = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  return clampNumber(parsed, 0, 59);
};

const getCaloriesLevel = (calories: number): 'Thấp' | 'Trung bình' | 'Cao' => {
  if (calories < 400) {
    return 'Thấp';
  }
  if (calories < 650) {
    return 'Trung bình';
  }
  return 'Cao';
};

export const MealPlanPendingScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const user = useAppSelector(selectUser);
  const { scale } = useResponsive();
  const styles = React.useMemo(() => createStyles(scale), [scale]);

  const mealType = route?.params?.mealType ?? 'Bữa ăn';
  const mealTypeKey = toMealTypeKey(route?.params?.mealTypeKey ?? route?.params?.mealType);
  const dateLabel = route?.params?.date ?? '';
  const selectedDateIso = route?.params?.selectedDateIso;
  const incomingMealPlan = route?.params?.mealPlan as MealPlan | undefined;

  const initialDate = React.useMemo(() => {
    const plannedDate = incomingMealPlan?.plannedDate ? new Date(incomingMealPlan.plannedDate) : null;
    if (plannedDate && !Number.isNaN(plannedDate.getTime())) {
      return plannedDate;
    }

    const fallbackDate = selectedDateIso ? new Date(selectedDateIso) : new Date();
    if (Number.isNaN(fallbackDate.getTime())) {
      return new Date();
    }

    if (mealTypeKey === 'breakfast') {
      fallbackDate.setHours(7, 30, 0, 0);
    } else if (mealTypeKey === 'lunch') {
      fallbackDate.setHours(12, 30, 0, 0);
    } else {
      fallbackDate.setHours(19, 0, 0, 0);
    }

    return fallbackDate;
  }, [incomingMealPlan?.plannedDate, mealTypeKey, selectedDateIso]);

  const initialTime = React.useMemo(() => to12hState(initialDate), [initialDate]);

  const [hour, setHour] = React.useState(initialTime.hour);
  const [minute, setMinute] = React.useState(initialTime.minute);
  const [hourText, setHourText] = React.useState(String(initialTime.hour).padStart(2, '0'));
  const [minuteText, setMinuteText] = React.useState(String(initialTime.minute).padStart(2, '0'));
  const [meridiem, setMeridiem] = React.useState<'AM' | 'PM'>(initialTime.meridiem);
  const [selectedRecipes, setSelectedRecipes] = React.useState<SelectedRecipe[]>([]);
  const [expectedDiners, setExpectedDiners] = React.useState<number>(incomingMealPlan?.expectedDiners ?? 1);
  const [guestCount, setGuestCount] = React.useState<number>(incomingMealPlan?.guestCount ?? 0);
  const [saving, setSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const nextTime = to12hState(initialDate);
    setHour(nextTime.hour);
    setMinute(nextTime.minute);
    setHourText(String(nextTime.hour).padStart(2, '0'));
    setMinuteText(String(nextTime.minute).padStart(2, '0'));
    setMeridiem(nextTime.meridiem);
    setExpectedDiners(Math.max(1, incomingMealPlan?.expectedDiners ?? 1));
    setGuestCount(Math.max(0, incomingMealPlan?.guestCount ?? 0));

    const recipesFromRoute = route?.params?.selectedRecipes as SelectedRecipe[] | null | undefined;
    if (Array.isArray(recipesFromRoute)) {
      setSelectedRecipes(recipesFromRoute);
      return;
    }

    setSelectedRecipes(parseRecipesFromNotes(incomingMealPlan?.notes));
  }, [incomingMealPlan?.id, incomingMealPlan?.notes, initialDate, route?.params?.selectedRecipes]);

  const actualDiners = Math.max(0, incomingMealPlan?.actualDiners ?? expectedDiners);

  React.useEffect(() => {
    if (expectedDiners < guestCount) {
      setExpectedDiners(guestCount);
    }
  }, [expectedDiners, guestCount]);

  const userId = React.useMemo(() => {
    if (!user?.id) {
      return null;
    }

    const parsed = Number(user.id);
    return Number.isNaN(parsed) ? null : parsed;
  }, [user?.id]);

  const plannedDateTimeIso = React.useMemo(() => {
    const base = selectedDateIso ? new Date(selectedDateIso) : new Date();
    if (Number.isNaN(base.getTime())) {
      return toLocalDateTimeString(new Date());
    }

    base.setHours(to24hHour(hour, meridiem), minute, 0, 0);
    return toLocalDateTimeString(base);
  }, [hour, meridiem, minute, selectedDateIso]);

  const applyHourText = React.useCallback(() => {
    const nextHour = normalizeHourInput(hourText);
    setHour(nextHour);
    setHourText(String(nextHour).padStart(2, '0'));
  }, [hourText]);

  const applyMinuteText = React.useCallback(() => {
    const nextMinute = normalizeMinuteInput(minuteText);
    setMinute(nextMinute);
    setMinuteText(String(nextMinute).padStart(2, '0'));
  }, [minuteText]);

  const onChangeHourText = (value: string) => {
    const numeric = value.replace(/[^0-9]/g, '').slice(0, 2);
    setHourText(numeric);
  };

  const onChangeMinuteText = (value: string) => {
    const numeric = value.replace(/[^0-9]/g, '').slice(0, 2);
    setMinuteText(numeric);
  };

  const onPressAddRecipe = () => {
    navigation.navigate('MealPlanRecipeSearch', {
      mealType,
      mealTypeKey,
      date: dateLabel,
      selectedDateIso,
      mealPlan: incomingMealPlan,
      selectedRecipes,
    });
  };

  const onPressDeleteRecipe = (recipeId: number) => {
    setSelectedRecipes((previous) => previous.filter((item) => item.recipe_id !== recipeId));
  };

  const onPressRecipeDetail = (recipe: SelectedRecipe) => {
    navigation.navigate('RecipeDetail', {
      recipeId: recipe.recipe_id,
      recipeName: recipe.recipe_name,
      mealId: incomingMealPlan?.id,
      cookTimeMinutes: recipe.cook_time_minutes,
      caloriesKcal: recipe.calories_kcal,
      difficulty: recipe.difficulty,
      source: 'search',
      availableIngredients: [],
      missingIngredients: [],
      warningMessage: recipe.warning_message ?? null,
    });
  };

  const onPressSave = async () => {
    if (!userId) {
      setErrorMessage('Không xác định được người dùng.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        mealType: mealTypeKey,
        plannedDate: plannedDateTimeIso,
        notes: buildNotes(selectedRecipes),
        expectedDiners,
        guestCount,
      };

      if (incomingMealPlan?.id) {
        await plannerApi.updateMealPlan(userId, incomingMealPlan.id, payload);
      } else {
        await plannerApi.createMealPlan(userId, payload);
      }

      navigation.navigate('Planner', { refreshAt: Date.now() });
    } catch (error: any) {
      setErrorMessage(error?.message ?? 'Không thể lưu lịch bữa ăn.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader marginBottom={scale(18)} leftAction="back" />

        <View style={styles.titleRow}>
          <Text style={styles.title}>{`Lên lịch ${mealType}`}</Text>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Thời gian bắt đầu bữa ăn</Text>
          <TouchableOpacity
            style={[styles.saveHeaderButton, saving ? styles.saveButtonDisabled : null]}
            onPress={onPressSave}
            disabled={saving}
            activeOpacity={0.9}
          >
            <Ionicons name={saving ? 'hourglass-outline' : 'checkmark-done-outline'} size={scale(16)} color="#FFFFFF" />
            <Text style={styles.saveHeaderButtonText}>{saving ? 'Đang lưu...' : 'Lưu lịch'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.timeCard}>
          <View style={styles.timeInputRow}>
            <View style={styles.timeInputBlock}>
              <Text style={styles.timeInputLabel}>Giờ</Text>
              <TextInput
                value={hourText}
                onChangeText={onChangeHourText}
                onBlur={applyHourText}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="07"
                placeholderTextColor="#8E8E93"
                style={styles.timeInputField}
              />
            </View>

            <Text style={styles.timeInputColon}>:</Text>

            <View style={styles.timeInputBlock}>
              <Text style={styles.timeInputLabel}>Phút</Text>
              <TextInput
                value={minuteText}
                onChangeText={onChangeMinuteText}
                onBlur={applyMinuteText}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="00"
                placeholderTextColor="#8E8E93"
                style={styles.timeInputField}
              />
            </View>
          </View>

          <View style={styles.timeRow}>
            <TouchableOpacity
              style={styles.timeAdjustButton}
              onPress={() => {
                const nextHour = hour === 1 ? 12 : hour - 1;
                setHour(nextHour);
                setHourText(String(nextHour).padStart(2, '0'));
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-down" size={scale(16)} color="#4F378A" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeAdjustButton}
              onPress={() => {
                const nextHour = hour === 12 ? 1 : hour + 1;
                setHour(nextHour);
                setHourText(String(nextHour).padStart(2, '0'));
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-up" size={scale(16)} color="#4F378A" />
            </TouchableOpacity>

            <View style={styles.timeAdjustSpacer} />

            <TouchableOpacity
              style={styles.timeAdjustButton}
              onPress={() => {
                const nextMinute = minute === 0 ? 59 : minute - 1;
                setMinute(nextMinute);
                setMinuteText(String(nextMinute).padStart(2, '0'));
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-down" size={scale(16)} color="#1D1B20" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeAdjustButton}
              onPress={() => {
                const nextMinute = (minute + 1) % 60;
                setMinute(nextMinute);
                setMinuteText(String(nextMinute).padStart(2, '0'));
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-up" size={scale(16)} color="#1D1B20" />
            </TouchableOpacity>
          </View>

          <View style={styles.periodRow}>
            <TouchableOpacity
              style={[styles.periodButton, meridiem === 'AM' ? styles.periodButtonActive : null]}
              onPress={() => setMeridiem('AM')}
              activeOpacity={0.85}
            >
              <Text style={[styles.periodText, meridiem === 'AM' ? styles.periodTextActive : null]}>AM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, meridiem === 'PM' ? styles.periodButtonActive : null]}
              onPress={() => setMeridiem('PM')}
              activeOpacity={0.85}
            >
              <Text style={[styles.periodText, meridiem === 'PM' ? styles.periodTextActive : null]}>PM</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.attendanceCard}>
          <Text style={styles.attendanceTitle}>Số lượng người ăn</Text>

          <View style={styles.attendanceRow}>
            <Text style={styles.attendanceLabel}>Dự kiến thành viên ăn</Text>
            <View style={styles.counterWrap}>
              <TouchableOpacity
                style={styles.counterButton}
                activeOpacity={0.85}
                onPress={() => setExpectedDiners((prev) => Math.max(1, prev - 1))}
              >
                <Ionicons name="remove" size={scale(16)} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{expectedDiners}</Text>
              <TouchableOpacity
                style={styles.counterButton}
                activeOpacity={0.85}
                onPress={() => setExpectedDiners((prev) => Math.min(30, prev + 1))}
              >
                <Ionicons name="add" size={scale(16)} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.attendanceRow}>
            <Text style={styles.attendanceLabel}>Số khách thêm ngoài gia đình</Text>
            <View style={styles.counterWrap}>
              <TouchableOpacity
                style={styles.counterButton}
                activeOpacity={0.85}
                onPress={() => setGuestCount((prev) => Math.max(0, prev - 1))}
              >
                <Ionicons name="remove" size={scale(16)} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{guestCount}</Text>
              <TouchableOpacity
                style={styles.counterButton}
                activeOpacity={0.85}
                onPress={() => {
                  setGuestCount((prev) => {
                    const next = Math.min(20, prev + 1);
                    if (next > expectedDiners) {
                      setExpectedDiners(next);
                    }
                    return next;
                  });
                }}
              >
                <Ionicons name="add" size={scale(16)} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.attendanceReadonlyRow}>
            <Text style={styles.attendanceReadonlyLabel}>Số thành viên thực tế sẽ ăn</Text>
            <Text style={styles.attendanceReadonlyValue}>{actualDiners}</Text>
          </View>
        </View>

        {selectedRecipes.length === 0 ? (
          <View style={styles.emptyStateWrap}>
            <Ionicons name="restaurant-outline" size={scale(38)} color="#F58D1D" />
            <Text style={styles.emptyText}>Chưa có món nào được lên lịch</Text>
          </View>
        ) : (
          <View style={styles.recipeListWrap}>
            {selectedRecipes.map((item) => (
              <View key={item.recipe_id} style={styles.recipeCard}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => onPressRecipeDetail(item)}>
                  <View style={styles.recipeImage} />
                  <Text style={styles.recipeTitle}>{item.recipe_name}</Text>
                  <Text style={styles.recipeSubtitle}>
                    {item.warning_message || `Độ khó: ${item.difficulty || 'Chưa rõ'}`}
                  </Text>

                  <View style={styles.recipeMetaRow}>
                    <View style={styles.recipeMetaItem}>
                      <Ionicons name="flame-outline" size={scale(16)} color="#FF7622" />
                      <Text style={styles.recipeMetaText}>
                        {`${Math.max(0, item.calories_kcal ?? 450)} kcal - ${getCaloriesLevel(
                          Math.max(0, item.calories_kcal ?? 450)
                        )}`}
                      </Text>
                    </View>
                    <View style={styles.recipeMetaItem}>
                      <Ionicons name="time-outline" size={scale(16)} color="#FF7622" />
                      <Text style={styles.recipeMetaText}>{item.cook_time_minutes} min</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => onPressDeleteRecipe(item.recipe_id)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash-outline" size={scale(18)} color="#C51B1B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={onPressAddRecipe} activeOpacity={0.9}>
          <View style={styles.addIconCircle}>
            <Ionicons name="add" size={scale(16)} color="#FFFFFF" />
          </View>
          <Text style={styles.addButtonText}>Thêm món</Text>
        </TouchableOpacity>

        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (scale: (size: number) => number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    content: {
      paddingHorizontal: scale(24),
      paddingTop: scale(16),
      paddingBottom: scale(24),
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scale(18),
    },
    title: {
      fontSize: scale(16),
      lineHeight: scale(26),
      color: '#1E1D1D',
      textTransform: 'capitalize',
    },
    dateLabel: {
      fontSize: scale(16),
      lineHeight: scale(26),
      color: '#1E1D1D',
      textTransform: 'capitalize',
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scale(10),
      gap: scale(12),
    },
    sectionTitle: {
      flex: 1,
      fontSize: scale(18),
      lineHeight: scale(28),
      color: '#111827',
      fontWeight: '700',
    },
    saveHeaderButton: {
      height: scale(40),
      borderRadius: scale(20),
      backgroundColor: '#FF7622',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(6),
      paddingHorizontal: scale(14),
    },
    saveHeaderButtonText: {
      color: '#FFFFFF',
      fontSize: scale(13),
      fontWeight: '700',
    },
    timeCard: {
      backgroundColor: '#FFD27C',
      opacity: 0.9,
      borderRadius: scale(28),
      paddingVertical: scale(18),
      paddingHorizontal: scale(20),
      marginBottom: scale(16),
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(8),
      marginBottom: scale(12),
    },
    timeInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scale(14),
      gap: scale(10),
    },
    timeInputBlock: {
      width: scale(98),
      alignItems: 'center',
    },
    timeInputLabel: {
      fontSize: scale(12),
      color: '#374151',
      fontWeight: '600',
      marginBottom: scale(6),
    },
    timeInputField: {
      width: '100%',
      height: scale(54),
      borderRadius: scale(12),
      backgroundColor: '#FFFFFF',
      textAlign: 'center',
      fontSize: scale(30),
      lineHeight: scale(34),
      color: '#111827',
      fontWeight: '700',
      paddingVertical: 0,
    },
    timeInputColon: {
      fontSize: scale(34),
      lineHeight: scale(40),
      color: '#1D1B20',
      fontWeight: '700',
      marginTop: scale(16),
    },
    timeAdjustButton: {
      width: scale(32),
      height: scale(32),
      borderRadius: scale(8),
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeAdjustSpacer: {
      width: scale(20),
    },
    timeValue: {
      fontSize: scale(36),
      lineHeight: scale(42),
      fontWeight: '700',
      color: '#1D1B20',
      minWidth: scale(48),
      textAlign: 'center',
    },
    separator: {
      fontSize: scale(34),
      lineHeight: scale(38),
      color: '#1D1B20',
      fontWeight: '500',
      marginHorizontal: scale(4),
    },
    periodRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: scale(10),
    },
    periodButton: {
      width: scale(58),
      height: scale(36),
      borderRadius: scale(8),
      borderWidth: 1,
      borderColor: '#79747E',
      backgroundColor: '#ECE6F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    periodButtonActive: {
      backgroundColor: '#FFD8E4',
    },
    periodText: {
      fontSize: scale(16),
      lineHeight: scale(20),
      color: '#49454F',
      fontWeight: '600',
    },
    periodTextActive: {
      color: '#633B48',
    },
    attendanceCard: {
      borderRadius: scale(16),
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: scale(14),
      paddingVertical: scale(12),
      marginBottom: scale(14),
      gap: scale(10),
    },
    attendanceTitle: {
      fontSize: scale(15),
      color: '#111827',
      fontWeight: '700',
    },
    attendanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: scale(8),
    },
    attendanceLabel: {
      flex: 1,
      color: '#334155',
      fontSize: scale(13),
      lineHeight: scale(18),
      fontWeight: '500',
    },
    counterWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(8),
      backgroundColor: '#F8FAFC',
      borderRadius: scale(999),
      borderWidth: 1,
      borderColor: '#E2E8F0',
      paddingHorizontal: scale(8),
      height: scale(36),
    },
    counterButton: {
      width: scale(24),
      height: scale(24),
      borderRadius: scale(12),
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    counterValue: {
      minWidth: scale(24),
      textAlign: 'center',
      color: '#0F172A',
      fontSize: scale(14),
      fontWeight: '700',
    },
    attendanceReadonlyRow: {
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      paddingTop: scale(10),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    attendanceReadonlyLabel: {
      color: '#64748B',
      fontSize: scale(12),
      fontWeight: '600',
    },
    attendanceReadonlyValue: {
      color: '#0F172A',
      fontSize: scale(16),
      fontWeight: '700',
    },
    emptyStateWrap: {
      marginTop: scale(20),
      marginBottom: scale(12),
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(10),
    },
    emptyText: {
      fontSize: scale(16),
      lineHeight: scale(22),
      color: '#64748B',
      fontWeight: '600',
      textAlign: 'center',
    },
    recipeListWrap: {
      marginTop: scale(4),
      marginBottom: scale(8),
      gap: scale(16),
    },
    recipeCard: {
      position: 'relative',
    },
    recipeImage: {
      height: scale(137),
      borderRadius: scale(12),
      backgroundColor: '#C4C4C4',
      marginBottom: scale(8),
    },
    recipeTitle: {
      fontSize: scale(20),
      lineHeight: scale(24),
      color: '#181C2E',
      textTransform: 'capitalize',
      marginBottom: scale(4),
    },
    recipeSubtitle: {
      fontSize: scale(14),
      lineHeight: scale(17),
      color: '#4B5563',
      fontStyle: 'italic',
      textTransform: 'capitalize',
      marginBottom: scale(8),
    },
    recipeMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(18),
    },
    recipeMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(6),
    },
    recipeMetaText: {
      fontSize: scale(14),
      lineHeight: scale(17),
      color: '#181C2E',
    },
    deleteButton: {
      position: 'absolute',
      right: 0,
      bottom: scale(2),
      width: scale(28),
      height: scale(28),
      borderRadius: scale(14),
      backgroundColor: '#FFF1F2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButton: {
      marginTop: scale(10),
      alignSelf: 'center',
      height: scale(50),
      borderRadius: scale(30),
      backgroundColor: '#F58D1D',
      borderWidth: 1,
      borderColor: '#FFFFFF',
      paddingHorizontal: scale(18),
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(10),
    },
    addIconCircle: {
      width: scale(26),
      height: scale(26),
      borderRadius: scale(13),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F58D1D',
    },
    addButtonText: {
      fontSize: scale(14),
      lineHeight: scale(17),
      color: '#000000',
      textTransform: 'capitalize',
      fontWeight: '600',
    },
    errorText: {
      marginTop: scale(10),
      color: '#B91C1C',
      textAlign: 'center',
      fontSize: scale(13),
      fontWeight: '600',
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
  });
