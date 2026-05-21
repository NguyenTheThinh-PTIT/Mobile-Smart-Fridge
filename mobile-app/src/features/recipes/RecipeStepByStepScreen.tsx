import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/authSlice';
import { axiosClient } from '@/core/network/AxiosClient';
import { useResponsive } from '@/core/theme/responsive';
import { Button, LoadingIndicator } from '@/core/base_widgets';
import { AppNotification, countUnreadNotifications } from '@/features/account/notificationsApi';
import { recipesApi, RecipeCookGuideResponse } from './api';

export const RecipeStepByStepScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { scale } = useResponsive();
  const styles = React.useMemo(() => createStyles(scale), [scale]);
  const params = route?.params as { recipeId: number; recipeName?: string; mealId?: number } | undefined;
  const user = useAppSelector(selectUser);

  const [guide, setGuide] = React.useState<RecipeCookGuideResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = React.useState<Record<number, boolean>>({});
  const [unreadCount, setUnreadCount] = React.useState(0);

  const userId = React.useMemo(() => {
    const parsed = Number(user?.id);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [user?.id]);

  const loadUnreadCount = React.useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    try {
      const payload = await axiosClient.get<unknown>(`/users/${userId}/notifications`);
      const data =
        payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)
          ? (payload as { data: unknown }).data
          : payload;

      if (!Array.isArray(data)) {
        setUnreadCount(0);
        return;
      }

      setUnreadCount(countUnreadNotifications(data as AppNotification[]));
    } catch {
      return;
    }
  }, [userId]);

  const loadGuide = React.useCallback(async () => {
    if (!params?.recipeId) {
      setError('Không tìm thấy công thức để hiển thị.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await recipesApi.getCookGuide(params.recipeId, params.mealId);
      setGuide(response);
      const initialChecked: Record<number, boolean> = {};
      response.steps.forEach((step) => {
        initialChecked[step.stepNumber] = false;
      });
      setCheckedSteps(initialChecked);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải hướng dẫn nấu ăn.');
    } finally {
      setLoading(false);
    }
  }, [params?.mealId, params?.recipeId]);

  React.useEffect(() => {
    loadGuide();
  }, [loadGuide]);

  React.useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  const completedAllSteps = React.useMemo(() => {
    if (!guide || guide.steps.length === 0) {
      return false;
    }
    return guide.steps.every((step) => checkedSteps[step.stepNumber]);
  }, [checkedSteps, guide]);

  const toggleStep = (stepNumber: number) => {
    setCheckedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  if (loading) {
    return <LoadingIndicator message="Đang tải hướng dẫn nấu ăn..." color="#FF7622" />;
  }

  if (error || !guide) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Ionicons name="chevron-back" size={scale(22)} color="#181C2E" />
          </TouchableOpacity>
          <Text style={styles.title}>Hướng dẫn nấu</Text>
          <View style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={scale(20)} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Không tải được hướng dẫn</Text>
          <Text style={styles.errorText}>{error || 'Đã có lỗi xảy ra.'}</Text>
          <Button title="Tải lại" onPress={loadGuide} size="large" style={styles.reloadButton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Ionicons name="chevron-back" size={scale(22)} color="#181C2E" />
          </TouchableOpacity>
          <Text style={styles.title}>Hướng dẫn nấu</Text>
          <TouchableOpacity
            style={styles.notificationWrap}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('NotificationsCenter')}
          >
            {unreadCount > 0 ? (
              <View style={[styles.notificationBadge, unreadCount > 99 ? styles.notificationBadgeLarge : null]}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
              </View>
            ) : null}
            <View style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={scale(20)} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.recipeName}>{guide.recipeName || params?.recipeName || 'Công thức'}</Text>
          <Text style={styles.subText}>Số người thực tế ăn: {guide.actualDiners}</Text>
          <Text style={styles.noteText}>{guide.note}</Text>
        </View>

        <Text style={styles.sectionTitle}>Định lượng nguyên liệu</Text>
        {guide.ingredients.map((item) => (
          <View key={item.foodId} style={styles.ingredientRow}>
            <View style={styles.ingredientNameWrap}>
              <Text style={styles.ingredientName}>{item.foodName}</Text>
              <Text style={styles.ingredientMeta}>Mặc định 1 người: {item.requiredPerPerson} {item.unit}</Text>
            </View>
            <View style={styles.totalPill}>
              <Text style={styles.totalPillText}>{item.defaultTotalQuantity} {item.unit}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Nấu ăn từng bước</Text>
        {guide.steps.map((step) => {
          const checked = !!checkedSteps[step.stepNumber];
          return (
            <TouchableOpacity
              key={step.stepNumber}
              style={[styles.stepCard, checked ? styles.stepCardDone : null]}
              onPress={() => toggleStep(step.stepNumber)}
              activeOpacity={0.85}
            >
              <View style={[styles.stepCheck, checked ? styles.stepCheckDone : null]}>
                {checked ? <Ionicons name="checkmark" size={scale(16)} color="#FFFFFF" /> : null}
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Bước {step.stepNumber}</Text>
                <Text style={styles.stepInstruction}>{step.instruction || 'Thực hiện theo công thức.'}</Text>
                {step.mediaUrl ? <Text style={styles.stepMedia}>{step.mediaUrl}</Text> : null}
              </View>
            </TouchableOpacity>
          );
        })}

        <Button
          title="Hoàn thành"
          onPress={() =>
            navigation.navigate('RecipeConsumptionConfirm', {
              recipeId: guide.recipeId,
              recipeName: guide.recipeName,
              mealId: guide.mealId,
              actualDiners: guide.actualDiners,
              ingredients: guide.ingredients,
            })
          }
          size="large"
          disabled={!completedAllSteps}
          style={
            completedAllSteps
              ? styles.completeButton
              : { ...styles.completeButton, ...styles.completeButtonDisabled }
          }
          textStyle={styles.completeButtonText}
        />
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
      paddingHorizontal: scale(20),
      paddingBottom: scale(28),
      paddingTop: scale(8),
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scale(18),
    },
    backButton: {
      width: scale(45),
      height: scale(45),
      borderRadius: scale(23),
      backgroundColor: '#ECF0F4',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: scale(17),
      lineHeight: scale(22),
      color: '#181C2E',
      fontWeight: '500',
    },
    notificationWrap: {
      width: scale(45),
      height: scale(54),
      alignItems: 'center',
      justifyContent: 'flex-end',
      position: 'relative',
    },
    notificationButton: {
      width: scale(45),
      height: scale(45),
      borderRadius: scale(23),
      backgroundColor: '#181C2E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    notificationBadge: {
      position: 'absolute',
      top: scale(0),
      right: scale(-4),
      width: scale(27),
      height: scale(27),
      borderRadius: scale(20),
      backgroundColor: '#FF7622',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    notificationBadgeLarge: {
      minWidth: scale(24),
      width: 'auto',
      paddingHorizontal: scale(5),
    },
    notificationBadgeText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: scale(11),
    },
    heroCard: {
      borderRadius: scale(20),
      padding: scale(16),
      backgroundColor: '#FFF7ED',
      borderWidth: 1,
      borderColor: '#FED7AA',
      marginBottom: scale(16),
      gap: scale(4),
    },
    recipeName: {
      fontSize: scale(20),
      lineHeight: scale(24),
      color: '#181C2E',
      fontWeight: '700',
    },
    subText: {
      fontSize: scale(13),
      lineHeight: scale(18),
      color: '#334155',
      fontWeight: '600',
    },
    noteText: {
      fontSize: scale(12),
      lineHeight: scale(18),
      color: '#64748B',
    },
    sectionTitle: {
      marginBottom: scale(10),
      color: '#181C2E',
      fontSize: scale(16),
      lineHeight: scale(20),
      fontWeight: '700',
      marginTop: scale(8),
    },
    ingredientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: scale(14),
      borderWidth: 1,
      borderColor: '#E2E8F0',
      paddingHorizontal: scale(12),
      paddingVertical: scale(11),
      marginBottom: scale(8),
      backgroundColor: '#FFFFFF',
      gap: scale(10),
    },
    ingredientNameWrap: {
      flex: 1,
      gap: scale(2),
    },
    ingredientName: {
      color: '#0F172A',
      fontSize: scale(14),
      lineHeight: scale(18),
      fontWeight: '700',
    },
    ingredientMeta: {
      color: '#64748B',
      fontSize: scale(12),
      lineHeight: scale(16),
      fontWeight: '500',
    },
    totalPill: {
      borderRadius: scale(999),
      paddingHorizontal: scale(10),
      paddingVertical: scale(6),
      backgroundColor: '#F1F5F9',
    },
    totalPillText: {
      color: '#0F172A',
      fontSize: scale(12),
      lineHeight: scale(15),
      fontWeight: '700',
    },
    stepCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: scale(10),
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: scale(16),
      padding: scale(12),
      marginBottom: scale(9),
      backgroundColor: '#FFFFFF',
    },
    stepCardDone: {
      borderColor: '#FDBA74',
      backgroundColor: '#FFF7ED',
    },
    stepCheck: {
      marginTop: scale(2),
      width: scale(22),
      height: scale(22),
      borderRadius: scale(11),
      borderWidth: 1,
      borderColor: '#CBD5E1',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    stepCheckDone: {
      borderColor: '#F97316',
      backgroundColor: '#F97316',
    },
    stepContent: {
      flex: 1,
      gap: scale(3),
    },
    stepTitle: {
      color: '#0F172A',
      fontSize: scale(14),
      lineHeight: scale(18),
      fontWeight: '700',
    },
    stepInstruction: {
      color: '#334155',
      fontSize: scale(13),
      lineHeight: scale(19),
    },
    stepMedia: {
      color: '#F97316',
      fontSize: scale(12),
      lineHeight: scale(16),
      fontWeight: '500',
    },
    completeButton: {
      marginTop: scale(16),
      backgroundColor: '#F97316',
      borderRadius: scale(14),
    },
    completeButtonDisabled: {
      backgroundColor: '#CBD5E1',
    },
    completeButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: scale(15),
    },
    errorCard: {
      marginHorizontal: scale(16),
      marginTop: scale(30),
      borderRadius: scale(16),
      borderWidth: 1,
      borderColor: '#FECACA',
      backgroundColor: '#FEF2F2',
      padding: scale(16),
      gap: scale(8),
    },
    errorTitle: {
      color: '#991B1B',
      fontSize: scale(16),
      lineHeight: scale(20),
      fontWeight: '700',
    },
    errorText: {
      color: '#B91C1C',
      fontSize: scale(13),
      lineHeight: scale(18),
    },
    reloadButton: {
      marginTop: scale(4),
      backgroundColor: '#F97316',
    },
  });
