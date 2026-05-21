import React from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/authSlice';
import { axiosClient } from '@/core/network/AxiosClient';
import { useResponsive } from '@/core/theme/responsive';
import { Button, LoadingIndicator } from '@/core/base_widgets';
import { AppNotification, countUnreadNotifications } from '@/features/account/notificationsApi';
import { RecipeIngredientItem, recipesApi } from './api';

interface ConsumptionRouteParams {
  recipeId: number;
  recipeName: string;
  mealId?: number;
  actualDiners: number;
  ingredients: RecipeIngredientItem[];
}

export const RecipeConsumptionConfirmScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { scale } = useResponsive();
  const styles = React.useMemo(() => createStyles(scale), [scale]);
  const params = route?.params as ConsumptionRouteParams | undefined;
  const user = useAppSelector(selectUser);

  const [actualDinersInput, setActualDinersInput] = React.useState(String(params?.actualDiners ?? 1));
  const [quantities, setQuantities] = React.useState<Record<number, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (!params?.ingredients) {
      return;
    }

    const initialValues: Record<number, string> = {};
    params.ingredients.forEach((item) => {
      initialValues[item.foodId] = String(item.defaultTotalQuantity);
    });
    setQuantities(initialValues);
  }, [params?.ingredients]);

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

  React.useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  const handleDinersChange = (value: string) => {
    const normalized = value.replace(/[^0-9]/g, '');
    setActualDinersInput(normalized);

    const dinerCount = Number(normalized || '0');
    if (!params?.ingredients || dinerCount <= 0) {
      return;
    }

    setQuantities((prev) => {
      const next: Record<number, string> = { ...prev };
      params.ingredients.forEach((item) => {
        const calculated = Number((item.requiredPerPerson * dinerCount).toFixed(3));
        next[item.foodId] = String(calculated);
      });
      return next;
    });
  };

  const submitConsumption = async () => {
    if (!params?.recipeId || !params.ingredients || params.ingredients.length === 0) {
      return;
    }

    const actualDiners = Math.max(1, Number(actualDinersInput || '1'));

    const items = params.ingredients.map((ingredient) => {
      const raw = quantities[ingredient.foodId];
      const parsed = Number(raw);
      return {
        foodId: ingredient.foodId,
        consumedQuantity: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
        unit: ingredient.unit,
      };
    });

    if (items.some((item) => item.consumedQuantity <= 0)) {
      Alert.alert('Dữ liệu chưa hợp lệ', 'Vui lòng nhập số lượng lớn hơn 0 cho tất cả thực phẩm.');
      return;
    }

    try {
      setSubmitting(true);
      await recipesApi.consumeIngredients(params.recipeId, {
        mealId: params.mealId,
        actualDiners,
        items,
      });

      Alert.alert('Thành công', 'Đã trừ kho nguyên liệu thành công.', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('RecipeDetail', {
              recipeId: params.recipeId,
              recipeName: params.recipeName,
            });
          },
        },
      ]);
    } catch (error: any) {
      const message = error?.message || 'Không thể trừ kho lúc này.';
      if (message.includes('Số lượng thực phẩm trong kho không đủ')) {
        Alert.alert('Kho không đủ', message);
      } else {
        Alert.alert('Lỗi', message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!params?.ingredients) {
    return <LoadingIndicator message="Đang chuẩn bị dữ liệu..." color="#FF7622" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Ionicons name="chevron-back" size={scale(22)} color="#181C2E" />
          </TouchableOpacity>
          <Text style={styles.title}>Xác nhận tiêu thụ</Text>
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

        <View style={styles.infoCard}>
          <Text style={styles.recipeName}>{params.recipeName}</Text>
          <Text style={styles.infoText}>Mặc định định lượng dưới đây cho 1 người x số người thực tế ăn.</Text>
        </View>

        <View style={styles.dinersRow}>
          <Text style={styles.dinersLabel}>Số người thực tế ăn</Text>
          <TextInput
            value={actualDinersInput}
            onChangeText={handleDinersChange}
            keyboardType="number-pad"
            style={styles.dinersInput}
            placeholder="1"
            placeholderTextColor="#94A3B8"
          />
        </View>

        {params.ingredients.map((ingredient) => (
          <View key={ingredient.foodId} style={styles.foodCard}>
            <Text style={styles.foodName}>{ingredient.foodName}</Text>
            <Text style={styles.foodHint}>1 người: {ingredient.requiredPerPerson} {ingredient.unit}</Text>
            <View style={styles.foodInputRow}>
              <TextInput
                value={quantities[ingredient.foodId] ?? ''}
                onChangeText={(value) =>
                  setQuantities((prev) => ({
                    ...prev,
                    [ingredient.foodId]: value.replace(/[^0-9.]/g, ''),
                  }))
                }
                keyboardType="decimal-pad"
                style={styles.foodInput}
              />
              <Text style={styles.foodUnit}>{ingredient.unit}</Text>
            </View>
          </View>
        ))}

        <Button
          title={submitting ? 'Đang xử lý...' : 'Xác nhận trừ kho'}
          onPress={submitConsumption}
          size="large"
          disabled={submitting}
          style={
            submitting
              ? { ...styles.submitButton, ...styles.submitButtonDisabled }
              : styles.submitButton
          }
          textStyle={styles.submitText}
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
    infoCard: {
      borderRadius: scale(16),
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#F8FAFC',
      padding: scale(14),
      marginBottom: scale(14),
      gap: scale(4),
    },
    recipeName: {
      color: '#0F172A',
      fontSize: scale(18),
      lineHeight: scale(22),
      fontWeight: '700',
    },
    infoText: {
      color: '#64748B',
      fontSize: scale(13),
      lineHeight: scale(18),
    },
    dinersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scale(14),
      borderRadius: scale(14),
      borderWidth: 1,
      borderColor: '#E2E8F0',
      paddingHorizontal: scale(12),
      paddingVertical: scale(10),
      backgroundColor: '#FFFFFF',
    },
    dinersLabel: {
      color: '#1E293B',
      fontSize: scale(14),
      lineHeight: scale(18),
      fontWeight: '600',
    },
    dinersInput: {
      minWidth: scale(64),
      textAlign: 'center',
      paddingHorizontal: scale(8),
      paddingVertical: scale(6),
      borderRadius: scale(10),
      borderWidth: 1,
      borderColor: '#CBD5E1',
      color: '#0F172A',
      fontWeight: '700',
      fontSize: scale(14),
    },
    foodCard: {
      borderRadius: scale(14),
      borderWidth: 1,
      borderColor: '#E2E8F0',
      padding: scale(12),
      marginBottom: scale(10),
      backgroundColor: '#FFFFFF',
      gap: scale(4),
    },
    foodName: {
      color: '#0F172A',
      fontSize: scale(14),
      lineHeight: scale(18),
      fontWeight: '700',
    },
    foodHint: {
      color: '#64748B',
      fontSize: scale(12),
      lineHeight: scale(16),
      fontWeight: '500',
    },
    foodInputRow: {
      marginTop: scale(4),
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(8),
    },
    foodInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#CBD5E1',
      borderRadius: scale(10),
      paddingHorizontal: scale(10),
      paddingVertical: scale(8),
      color: '#0F172A',
      fontSize: scale(14),
      fontWeight: '600',
    },
    foodUnit: {
      color: '#334155',
      fontSize: scale(13),
      lineHeight: scale(16),
      fontWeight: '700',
      minWidth: scale(34),
      textAlign: 'right',
    },
    submitButton: {
      marginTop: scale(10),
      backgroundColor: '#F97316',
      borderRadius: scale(14),
    },
    submitButtonDisabled: {
      backgroundColor: '#CBD5E1',
    },
    submitText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: scale(15),
    },
  });
