import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/core/base_widgets';
import { useResponsive } from '@/core/theme/responsive';
import { useAppSelector } from '@/store/hooks';
import { selectFavoriteRecipes } from '@/store/favoriteRecipesSlice';

const getCaloriesLevel = (calories: number): 'Thấp' | 'Trung bình' | 'Cao' => {
  if (calories < 400) {
    return 'Thấp';
  }
  if (calories < 650) {
    return 'Trung bình';
  }
  return 'Cao';
};

export const FavoriteRecipesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { scale } = useResponsive();
  const styles = React.useMemo(() => createStyles(scale), [scale]);
  const favoriteRecipes = useAppSelector(selectFavoriteRecipes);
  const [currentPage, setCurrentPage] = React.useState(1);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(favoriteRecipes.length / pageSize));
  const normalizedPage = Math.min(currentPage, totalPages);
  const currentRecipesPage = favoriteRecipes.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);

  const maxVisiblePageButtons = 5;
  const pageWindowStart = Math.max(
    1,
    Math.min(
      normalizedPage - Math.floor(maxVisiblePageButtons / 2),
      totalPages - maxVisiblePageButtons + 1
    )
  );
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + maxVisiblePageButtons - 1);
  const visiblePages = Array.from(
    { length: pageWindowEnd - pageWindowStart + 1 },
    (_, index) => pageWindowStart + index
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [favoriteRecipes.length]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader marginBottom={scale(16)} leftAction="back" onPressLeft={() => navigation.goBack()} />

        <Text style={styles.title}>Danh sách món ăn yêu thích</Text>

        {favoriteRecipes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="heart-outline" size={scale(36)} color="#F97316" />
            <Text style={styles.emptyTitle}>Chưa có món yêu thích</Text>
            <Text style={styles.emptyText}>Bấm biểu tượng trái tim trong trang chi tiết món để thêm vào danh sách.</Text>
          </View>
        ) : (
          currentRecipesPage.map((recipe) => (
            <TouchableOpacity
              key={`favorite-${recipe.recipeId}`}
              activeOpacity={0.9}
              style={styles.recipeCard}
              onPress={() =>
                navigation.navigate('RecipeDetail', {
                  recipeId: recipe.recipeId,
                  recipeName: recipe.recipeName,
                  cookTimeMinutes: recipe.cookTimeMinutes,
                  caloriesKcal: recipe.caloriesKcal,
                  difficulty: recipe.difficulty,
                  cuisineType: recipe.cuisineType,
                  source: recipe.source,
                  warningMessage: recipe.warningMessage,
                  availableIngredients: recipe.availableIngredients,
                  missingIngredients: recipe.missingIngredients,
                  reason: recipe.reason,
                })
              }
            >
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={scale(28)} color="#FFFFFF" />
              </View>

              <Text style={styles.recipeTitle}>{recipe.recipeName}</Text>

              {recipe.warningMessage ? (
                <Text style={styles.recipeSubWarning} numberOfLines={2}>
                  {recipe.warningMessage}
                </Text>
              ) : null}

              <View style={styles.ingredientsWrap}>
                {recipe.availableIngredients.length > 0 ? (
                  <View style={styles.ingredientRow}>
                    <Text style={styles.ingredientLabel}>Có sẵn: </Text>
                    <Text style={styles.availableText}>{recipe.availableIngredients.slice(0, 3).join(' - ')}</Text>
                  </View>
                ) : null}

                {recipe.missingIngredients.length > 0 ? (
                  <View style={styles.ingredientRow}>
                    <Text style={styles.ingredientLabel}>Thiếu: </Text>
                    <Text style={styles.missingText}>{recipe.missingIngredients.slice(0, 3).join(' - ')}</Text>
                  </View>
                ) : null}

                {recipe.availableIngredients.length === 0 && recipe.missingIngredients.length === 0 ? (
                  <View style={styles.ingredientRow}>
                    <Text style={styles.ingredientLabel}>Nguyên liệu: </Text>
                    <Text style={styles.unknownIngredientText}>Chưa có dữ liệu</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="flame-outline" size={scale(16)} color="#FF7622" />
                  <Text style={styles.metaText}>
                    {`${Math.max(0, recipe.caloriesKcal ?? 450)} kcal - ${getCaloriesLevel(
                      Math.max(0, recipe.caloriesKcal ?? 450)
                    )}`}
                  </Text>
                </View>

                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={scale(16)} color="#FF7622" />
                  <Text style={styles.metaText}>{recipe.cookTimeMinutes} min</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {favoriteRecipes.length > pageSize ? (
          <View style={styles.paginationWrap}>
            <TouchableOpacity
              style={[styles.pageNavButton, normalizedPage === 1 ? styles.pageNavDisabled : null]}
              activeOpacity={0.85}
              disabled={normalizedPage === 1}
              onPress={() => setCurrentPage(1)}
            >
              <Ionicons
                name="play-skip-back-outline"
                size={scale(14)}
                color={normalizedPage === 1 ? '#94A3B8' : '#334155'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pageNavButton, normalizedPage === 1 ? styles.pageNavDisabled : null]}
              activeOpacity={0.85}
              disabled={normalizedPage === 1}
              onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              <Ionicons name="chevron-back" size={scale(16)} color={normalizedPage === 1 ? '#94A3B8' : '#334155'} />
            </TouchableOpacity>

            <View style={styles.pageDotsWrap}>
              {visiblePages.map((pageNumber) => {
                const isActive = pageNumber === normalizedPage;
                return (
                  <TouchableOpacity
                    key={`favorite-page-${pageNumber}`}
                    style={[styles.pageDot, isActive ? styles.pageDotActive : null]}
                    onPress={() => setCurrentPage(pageNumber)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.pageDotText, isActive ? styles.pageDotTextActive : null]}>{pageNumber}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.pageNavButton, normalizedPage === totalPages ? styles.pageNavDisabled : null]}
              activeOpacity={0.85}
              disabled={normalizedPage === totalPages}
              onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              <Ionicons
                name="chevron-forward"
                size={scale(16)}
                color={normalizedPage === totalPages ? '#94A3B8' : '#334155'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pageNavButton, normalizedPage === totalPages ? styles.pageNavDisabled : null]}
              activeOpacity={0.85}
              disabled={normalizedPage === totalPages}
              onPress={() => setCurrentPage(totalPages)}
            >
              <Ionicons
                name="play-skip-forward-outline"
                size={scale(14)}
                color={normalizedPage === totalPages ? '#94A3B8' : '#334155'}
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (scale: (size: number) => number) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#F8F7F6',
    },
    content: {
      paddingHorizontal: scale(16),
      paddingTop: scale(12),
      paddingBottom: scale(24),
    },
    title: {
      fontSize: scale(24),
      fontWeight: '900',
      color: '#0F172A',
      marginBottom: scale(12),
    },
    emptyWrap: {
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: scale(16),
      alignItems: 'center',
      paddingVertical: scale(24),
      paddingHorizontal: scale(16),
    },
    emptyTitle: {
      marginTop: scale(8),
      fontSize: scale(16),
      fontWeight: '800',
      color: '#0F172A',
    },
    emptyText: {
      marginTop: scale(4),
      fontSize: scale(13),
      lineHeight: scale(20),
      textAlign: 'center',
      color: '#64748B',
    },
    recipeCard: {
      marginBottom: scale(14),
      backgroundColor: '#FFFFFF',
      borderRadius: scale(18),
      borderWidth: 1,
      borderColor: '#E2E8F0',
      padding: scale(12),
    },
    imagePlaceholder: {
      height: scale(132),
      borderRadius: scale(14),
      backgroundColor: '#C4C4C4',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scale(10),
    },
    recipeTitle: {
      fontSize: scale(18),
      lineHeight: scale(22),
      color: '#181C2E',
      marginBottom: scale(6),
      fontWeight: '700',
    },
    recipeSubWarning: {
      fontSize: scale(13),
      lineHeight: scale(18),
      color: '#B91C1C',
      fontWeight: '600',
      marginBottom: scale(6),
    },
    ingredientsWrap: {
      gap: scale(4),
      marginBottom: scale(8),
    },
    ingredientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    ingredientLabel: {
      fontSize: scale(13),
      color: '#1E293B',
      fontWeight: '700',
    },
    availableText: {
      fontSize: scale(13),
      color: '#0F766E',
      fontWeight: '600',
    },
    missingText: {
      fontSize: scale(13),
      color: '#B45309',
      fontWeight: '600',
    },
    unknownIngredientText: {
      fontSize: scale(13),
      color: '#64748B',
      fontWeight: '500',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: scale(12),
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(6),
    },
    metaText: {
      fontSize: scale(13),
      color: '#475569',
      fontWeight: '600',
    },
    paginationWrap: {
      marginTop: scale(8),
      marginBottom: scale(8),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(8),
    },
    pageNavButton: {
      width: scale(30),
      height: scale(30),
      borderRadius: scale(8),
      borderWidth: 1,
      borderColor: '#CBD5E1',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    pageNavDisabled: {
      backgroundColor: '#F8FAFC',
      borderColor: '#E2E8F0',
    },
    pageDotsWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(6),
    },
    pageDot: {
      minWidth: scale(30),
      height: scale(30),
      borderRadius: scale(8),
      borderWidth: 1,
      borderColor: '#CBD5E1',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: scale(8),
      backgroundColor: '#FFFFFF',
    },
    pageDotActive: {
      borderColor: '#F97316',
      backgroundColor: '#FFF7ED',
    },
    pageDotText: {
      fontSize: scale(12),
      color: '#475569',
      fontWeight: '700',
    },
    pageDotTextActive: {
      color: '#C2410C',
    },
  });
