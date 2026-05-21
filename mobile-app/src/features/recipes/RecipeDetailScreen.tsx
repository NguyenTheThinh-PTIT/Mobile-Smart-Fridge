import React from 'react';
import { Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AppNoticeModal, Button } from '@/core/base_widgets';
import { useResponsive } from '@/core/theme/responsive';
import { axiosClient } from '@/core/network/AxiosClient';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/authSlice';
import { AppNotification, countUnreadNotifications } from '@/features/account/notificationsApi';
import { recipesApi } from './api';
import type { RecipeDetailParams } from './api';
import { favoriteRecipesActions, selectIsRecipeFavorite } from '@/store/favoriteRecipesSlice';

export const RecipeDetailScreen: React.FC<any> = ({
  navigation,
  route,
}) => {
  const dispatch = useAppDispatch();
  const { scale } = useResponsive();
  const styles = React.useMemo(() => createStyles(scale), [scale]);
  const params = route?.params as RecipeDetailParams | undefined;
  const user = useAppSelector(selectUser);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [fallbackIngredients, setFallbackIngredients] = React.useState<string[]>([]);
  const [noticeState, setNoticeState] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: 'success' | 'info' | 'warning' | 'error';
  }>({
    visible: false,
    title: '',
    message: '',
    variant: 'info',
  });

  const userId = React.useMemo(() => {
    const parsed = Number(user?.id);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [user?.id]);

  const availableIngredients = params?.availableIngredients ?? [];
  const missingIngredients = params?.missingIngredients ?? [];
  const displayIngredients =
    availableIngredients.length > 0
      ? availableIngredients
      : fallbackIngredients;

  const description =
    params?.reason?.trim() ||
    params?.warningMessage?.trim() ||
    'Món ăn này phù hợp cho bữa trưa hoặc bữa tối, dễ chuẩn bị và cân bằng dinh dưỡng.';

  const ingredientSummary =
    displayIngredients.length > 0
      ? displayIngredients.slice(0, 3).join(' - ')
      : 'Chưa có dữ liệu nguyên liệu';

  const cuisineTag = params?.cuisineType?.trim() || 'Chưa có tag';
  const hasCuisineTag = Boolean(params?.cuisineType?.trim());
  const caloriesKcal = Math.max(0, params?.caloriesKcal ?? 450);
  const recipeId = params?.recipeId ?? -1;
  const isFavorite = useAppSelector(selectIsRecipeFavorite(recipeId));

  const caloriesLevel = React.useMemo(() => {
    if (caloriesKcal < 400) {
      return 'Thấp';
    }
    if (caloriesKcal < 650) {
      return 'Trung bình';
    }
    if (caloriesKcal < 900) {
      return 'Cao';
    }
    return 'Rất cao';
  }, [caloriesKcal]);

  const openUrlSafely = async (url: string): Promise<void> => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch {
      return;
    }
  };

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

  useFocusEffect(
    React.useCallback(() => {
      loadUnreadCount();
      return undefined;
    }, [loadUnreadCount])
  );

  React.useEffect(() => {
    const hasIngredientData = availableIngredients.length > 0;
    if (hasIngredientData || !params?.recipeId) {
      setFallbackIngredients([]);
      return;
    }

    let mounted = true;

    const loadFallbackIngredients = async () => {
      try {
        const guide = await recipesApi.getCookGuide(params.recipeId, params.mealId);
        if (!mounted) {
          return;
        }

        const ingredients = (guide.ingredients ?? [])
          .map((item) => item.foodName)
          .filter((name) => !!name && name.trim().length > 0);

        setFallbackIngredients(ingredients);
      } catch {
        if (mounted) {
          setFallbackIngredients([]);
        }
      }
    };

    loadFallbackIngredients();

    return () => {
      mounted = false;
    };
  }, [availableIngredients.length, params?.mealId, params?.recipeId]);

  const onPressFavorite = () => {
    if (!params?.recipeId) {
      return;
    }

    if (isFavorite) {
      setNoticeState({
        visible: true,
        title: 'Thông báo',
        message: 'Món ăn đã có trong danh sách yêu thích.',
        variant: 'info',
      });
      return;
    }

    dispatch(
      favoriteRecipesActions.addFavoriteRecipe({
        recipeId: params.recipeId,
        recipeName: params.recipeName,
        cookTimeMinutes: params.cookTimeMinutes,
        caloriesKcal: params.caloriesKcal,
        difficulty: params.difficulty,
        cuisineType: params.cuisineType,
        availableIngredients: params.availableIngredients ?? [],
        missingIngredients: params.missingIngredients ?? [],
        reason: params.reason,
        warningMessage: params.warningMessage,
        source: params.source,
        createdAt: new Date().toISOString(),
      })
    );

    setNoticeState({
      visible: true,
      title: 'Thông báo',
      message: 'Đã thêm vào danh sách món ăn yêu thích.',
      variant: 'success',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Ionicons name="chevron-back" size={scale(22)} color="#181C2E" />
          </TouchableOpacity>
          <Text style={styles.title}>Chi tiết món ăn</Text>
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

        <View style={styles.heroImage}>
          <Ionicons name="restaurant-outline" size={scale(40)} color="#FFFFFF" />
          <TouchableOpacity style={styles.saveButton} activeOpacity={0.9} onPress={onPressFavorite}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={scale(18)} color={isFavorite ? '#EF4444' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>

        <View style={styles.ingredientBadge}>
          <View style={styles.dot} />
          <Text style={styles.ingredientBadgeText}>{ingredientSummary}</Text>
        </View>

        <Text style={styles.recipeName}>{params?.recipeName || 'Món ăn'}</Text>
        <Text style={styles.recipeDesc}>{description}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="flame-outline" size={scale(18)} color="#FF7622" />
            <Text style={styles.metaText}>{`${caloriesKcal} kcal - ${caloriesLevel}`}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={scale(18)} color="#FF7622" />
            <Text style={styles.metaText}>{params?.cookTimeMinutes ?? 0} min</Text>
          </View>
        </View>

        <View style={styles.tagRow}>
          <TouchableOpacity
            style={styles.tagPillLong}
            activeOpacity={0.7}
            disabled={!hasCuisineTag}
            onPress={() => {
              if (!hasCuisineTag) {
                return;
              }

              navigation.navigate('MainTabs', {
                screen: 'RecipesByTag',
                params: {
                  tagType: 'cuisine',
                  tagValue: cuisineTag,
                  tagLabel: cuisineTag,
                },
              });
            }}
          >
            <Text style={styles.tagText}>{cuisineTag}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tagPillShort}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('MainTabs', {
                screen: 'RecipesByTag',
                params: {
                  tagType: 'difficulty',
                  tagValue: params?.difficulty || 'Xào',
                  tagLabel: params?.difficulty || 'Xào',
                },
              })
            }
          >
            <Text style={styles.tagText}>{params?.difficulty || 'Xào'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Chế biến</Text>
        <View style={styles.linkRow}>
          <Ionicons name="logo-youtube" size={scale(24)} color="#181C2E" />
          <Text style={styles.linkText} onPress={() => openUrlSafely('https://www.youtube.com/watch?v=MRq6KIG-XQM')}>
            https://www.youtube.com/watch?v=MRq6KIG-XQM
          </Text>
        </View>
        <View style={styles.linkRow}>
          <Ionicons name="attach-outline" size={scale(24)} color="#181C2E" />
          <Text
            style={styles.linkText}
            onPress={() =>
              openUrlSafely(
                'https://www.bachhoaxanh.com/kinh-nghiem-hay/cach-lam-bo-luc-lac-cuc-mem-khong-bi-dai-1140095'
              )
            }
          >
            https://www.bachhoaxanh.com/kinh-nghiem-hay/cach-lam-bo-luc-lac-cuc-mem-khong-bi-dai-1140095
          </Text>
        </View>

        <View style={styles.shoppingButtonWrap}>
          <Button
            title="Xem chi tiết"
            onPress={() =>
              navigation.navigate('RecipeStepByStep', {
                recipeId: params?.recipeId,
                recipeName: params?.recipeName,
                mealId: params?.mealId,
              })
            }
            size="large"
            style={styles.shoppingButton}
            textStyle={styles.shoppingButtonText}
          />
        </View>

        {missingIngredients.length > 0 ? (
          <View style={styles.missingWrap}>
            <Text style={styles.missingTitle}>Nguyên liệu cần mua</Text>
            <Text style={styles.missingText}>{missingIngredients.slice(0, 6).join(' - ')}</Text>
          </View>
        ) : null}
      </ScrollView>

      <AppNoticeModal
        visible={noticeState.visible}
        title={noticeState.title}
        message={noticeState.message}
        variant={noticeState.variant}
        onClose={() =>
          setNoticeState({
            visible: false,
            title: '',
            message: '',
            variant: 'info',
          })
        }
      />
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
      paddingBottom: scale(30),
      paddingTop: scale(8),
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scale(20),
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
    heroImage: {
      width: '100%',
      height: scale(184),
      borderRadius: scale(32),
      backgroundColor: '#C4C4C4',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scale(16),
      position: 'relative',
    },
    saveButton: {
      position: 'absolute',
      right: scale(12),
      bottom: scale(12),
      width: scale(37),
      height: scale(37),
      borderRadius: scale(19),
      backgroundColor: 'rgba(255,255,255,0.24)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ingredientBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E9E9E9',
      borderRadius: scale(50),
      paddingHorizontal: scale(14),
      paddingVertical: scale(12),
      marginBottom: scale(14),
      backgroundColor: '#FFFFFF',
    },
    dot: {
      width: scale(21),
      height: scale(21),
      borderRadius: scale(11),
      backgroundColor: '#ECF0F4',
      marginRight: scale(12),
    },
    ingredientBadgeText: {
      flex: 1,
      color: '#181C2E',
      fontSize: scale(14),
      lineHeight: scale(17),
      textTransform: 'capitalize',
    },
    recipeName: {
      color: '#181C2E',
      fontSize: scale(20),
      lineHeight: scale(24),
      textTransform: 'capitalize',
      fontWeight: '700',
      marginBottom: scale(10),
    },
    recipeDesc: {
      color: '#A0A5BA',
      fontSize: scale(14),
      lineHeight: scale(24),
      marginBottom: scale(12),
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scale(14),
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(6),
    },
    metaText: {
      color: '#181C2E',
      fontSize: scale(14),
      lineHeight: scale(17),
    },
    tagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(12),
      marginBottom: scale(16),
    },
    tagPillLong: {
      height: scale(48),
      borderRadius: scale(80),
      backgroundColor: '#F0F5FA',
      paddingHorizontal: scale(16),
      alignItems: 'center',
      justifyContent: 'center',
    },
    tagPillShort: {
      height: scale(48),
      borderRadius: scale(80),
      backgroundColor: '#F0F5FA',
      paddingHorizontal: scale(16),
      alignItems: 'center',
      justifyContent: 'center',
    },
    tagText: {
      color: '#121223',
      fontSize: scale(16),
      lineHeight: scale(19),
      textTransform: 'capitalize',
    },
    sectionTitle: {
      color: '#181C2E',
      fontSize: scale(20),
      lineHeight: scale(24),
      textTransform: 'capitalize',
      fontWeight: '700',
      marginBottom: scale(12),
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: scale(12),
      gap: scale(12),
    },
    linkText: {
      flex: 1,
      color: '#000000',
      fontSize: scale(14),
      lineHeight: scale(20),
      textDecorationLine: 'underline',
    },
    shoppingButtonWrap: {
      marginTop: scale(6),
    },
    shoppingButton: {
      backgroundColor: '#FF7622',
      borderRadius: scale(12),
    },
    shoppingButtonText: {
      color: '#FFFFFF',
      fontSize: scale(14),
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    missingWrap: {
      marginTop: scale(14),
      padding: scale(12),
      borderRadius: scale(12),
      backgroundColor: '#FFF1F2',
      borderColor: '#FECDD3',
      borderWidth: 1,
    },
    missingTitle: {
      color: '#BE123C',
      fontSize: scale(14),
      fontWeight: '700',
      marginBottom: scale(4),
    },
    missingText: {
      color: '#9F1239',
      fontSize: scale(13),
      lineHeight: scale(19),
    },
  });
