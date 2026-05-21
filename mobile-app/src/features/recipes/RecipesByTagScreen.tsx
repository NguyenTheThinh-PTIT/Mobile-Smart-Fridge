import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '@/core/theme/responsive';
import { ErrorDisplay } from '@/core/base_widgets/ErrorDisplay';
import { LoadingIndicator } from '@/core/base_widgets/LoadingIndicator';
import { AppHeader } from '@/core/base_widgets';
import { recipesApi, RecipeSearchItem, RecipeDetailParams } from './api';

const DEFAULT_HOUSEHOLD_ID = Number(process.env.EXPO_PUBLIC_DEFAULT_HOUSEHOLD_ID || 1);
const ITEMS_PER_PAGE = 5;

const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const RecipesByTagScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { scale } = useResponsive();
  const styles = React.useMemo(() => createStyles(scale), [scale]);

  const { tagType, tagValue, tagLabel } = route.params || {};
  const [searchText, setSearchText] = React.useState('');
  const [allRecipes, setAllRecipes] = React.useState<RecipeSearchItem[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadRecipes = React.useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await recipesApi.searchRecipesByTag({
          householdId: DEFAULT_HOUSEHOLD_ID,
          tagType: tagType || 'cuisine',
          tagValue: tagValue || '',
          query: '',
          limit: 100,
          offset: 0,
        });

        setAllRecipes(response.results);
        setCurrentPage(1);
      } catch (err: any) {
        setError(err?.message || 'Không thể tải danh sách món ăn.');
      } finally {
        setLoading(false);
      }
    },
    [tagType, tagValue]
  );

  React.useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const openRecipeDetail = React.useCallback(
    (recipe: RecipeSearchItem) => {
      navigation.navigate('RecipeDetail', {
        recipeId: recipe.recipe_id,
        recipeName: recipe.recipe_name,
        cookTimeMinutes: recipe.cook_time_minutes,
        difficulty: recipe.difficulty,
        cuisineType: recipe.cuisine_type,
        source: 'search',
        warningMessage: recipe.warning_message,
        availableIngredients: [],
        missingIngredients: [],
        reason: '',
      } as RecipeDetailParams);
    },
    [navigation]
  );

  const normalizedSearch = normalizeSearchText(searchText);
  const filteredRecipes = normalizedSearch
    ? allRecipes.filter((recipe) => {
        const normalizedName = normalizeSearchText(recipe.recipe_name);
        return normalizedName.includes(normalizedSearch);
      })
    : allRecipes;

  const totalPages = Math.ceil(filteredRecipes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRecipes = filteredRecipes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const visibleStart = filteredRecipes.length > 0 ? startIndex + 1 : 0;
  const visibleEnd = filteredRecipes.length > 0 ? Math.min(startIndex + ITEMS_PER_PAGE, filteredRecipes.length) : 0;

  const pageNumbers = React.useMemo(() => {
    if (totalPages <= 1) {
      return [1];
    }

    const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return <LoadingIndicator message="Đang tải danh sách món ăn..." color="#F97316" />;
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Không tải được danh sách"
        message={error}
        onRetry={() => loadRecipes()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader leftAction="back" onPressLeft={() => navigation.goBack()} />

        <View style={styles.headerSection}>
          <Text style={styles.tagTitle}>{tagLabel || tagValue}</Text>
          <Text style={styles.tagCount}>
            {filteredRecipes.length} món ăn
          </Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={scale(16)} color="#A0A5BA" />
          <TextInput
            placeholder="Tìm trong danh sách"
            placeholderTextColor="#A0A5BA"
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
          />
        </View>

        <Text style={styles.sectionTitle}>
          {filteredRecipes.length > 0 ? 'Các món ăn' : 'Không có kết quả'}
        </Text>

        {paginatedRecipes.length > 0 ? (
          paginatedRecipes.map((recipe) => (
            <TouchableOpacity
              key={`recipe-${recipe.recipe_id}`}
              activeOpacity={0.9}
              style={styles.recipeCard}
              onPress={() => openRecipeDetail(recipe)}
            >
              <View style={styles.imagePlaceholder}>
                <Ionicons name="restaurant-outline" size={scale(28)} color="#FFFFFF" />
              </View>

              <Text style={styles.recipeTitle}>{recipe.recipe_name}</Text>
              <Text style={styles.recipeSub} numberOfLines={2}>
                {recipe.warning_message || `Độ khó: ${recipe.difficulty || 'Chưa rõ'}`}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={scale(16)} color="#FF7622" />
                  <Text style={styles.metaText}>{recipe.cook_time_minutes} min</Text>
                </View>
                {recipe.warning_message ? (
                  <View style={styles.warningPill}>
                    <Text style={styles.warningPillText}>Có cảnh báo dị ứng</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        ) : filteredRecipes.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="file-tray-outline" size={scale(24)} color="#94A3B8" />
            </View>
            <Text style={styles.emptyText}>Không tìm thấy món ăn phù hợp</Text>
          </View>
        ) : null}

        {filteredRecipes.length > 0 && (
          <View style={styles.paginationContainer}>
            <Text style={styles.paginationSummary}>
              Hiển thị {visibleStart}-{visibleEnd} / {filteredRecipes.length} món
            </Text>

            <View style={styles.paginationControls}>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={handlePreviousPage}
              disabled={currentPage === 1}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-back"
                size={scale(20)}
                color={currentPage === 1 ? '#CBD5E1' : '#181C2E'}
              />
            </TouchableOpacity>

              <View style={styles.pageNumberRow}>
                {pageNumbers.map((page) => (
                  <TouchableOpacity
                    key={`page-${page}`}
                    style={[styles.pageNumberChip, page === currentPage && styles.pageNumberChipActive]}
                    onPress={() => setCurrentPage(page)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pageNumberText, page === currentPage && styles.pageNumberTextActive]}>
                      {page}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                currentPage === totalPages && styles.paginationButtonDisabled,
              ]}
              onPress={handleNextPage}
              disabled={currentPage === totalPages}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-forward"
                size={scale(20)}
                color={currentPage === totalPages ? '#CBD5E1' : '#181C2E'}
              />
            </TouchableOpacity>
            </View>
          </View>
        )}
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
      paddingTop: scale(8),
      paddingBottom: scale(24),
    },
    headerSection: {
      marginBottom: scale(20),
      paddingVertical: scale(12),
    },
    tagTitle: {
      fontSize: scale(24),
      fontWeight: '800',
      color: '#181C2E',
      marginBottom: scale(4),
      textTransform: 'capitalize',
    },
    tagCount: {
      fontSize: scale(14),
      color: '#A0A5BA',
      fontWeight: '500',
    },
    searchWrap: {
      height: scale(54),
      borderRadius: scale(10),
      backgroundColor: '#F6F6F6',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: scale(16),
      marginBottom: scale(18),
    },
    searchInput: {
      marginLeft: scale(10),
      flex: 1,
      color: '#32343E',
      fontSize: scale(14),
      paddingVertical: 0,
    },
    sectionTitle: {
      fontSize: scale(24),
      lineHeight: scale(30),
      fontWeight: '800',
      color: '#181C2E',
      letterSpacing: scale(0.25),
      textShadowColor: 'rgba(255,118,34,0.14)',
      textShadowOffset: { width: 0, height: scale(3) },
      textShadowRadius: scale(10),
      marginBottom: scale(14),
    },
    recipeCard: {
      marginBottom: scale(18),
    },
    imagePlaceholder: {
      height: scale(130),
      borderRadius: scale(12),
      backgroundColor: '#C4C4C4',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scale(8),
    },
    recipeTitle: {
      fontSize: scale(18),
      lineHeight: scale(23),
      fontWeight: '400',
      color: '#181C2E',
      letterSpacing: scale(0.15),
      marginBottom: scale(6),
    },
    recipeSub: {
      fontSize: scale(14),
      lineHeight: scale(17),
      color: '#4B5563',
      fontStyle: 'italic',
      textTransform: 'capitalize',
      marginBottom: scale(8),
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(18),
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(6),
    },
    metaText: {
      fontSize: scale(12),
      color: '#181C2E',
    },
    warningPill: {
      backgroundColor: '#FFF1F2',
      borderColor: '#FECDD3',
      borderWidth: 1,
      borderRadius: scale(999),
      paddingHorizontal: scale(10),
      paddingVertical: scale(4),
    },
    warningPillText: {
      color: '#BE123C',
      fontSize: scale(11),
      fontWeight: '700',
    },
    emptyBox: {
      borderRadius: scale(10),
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: scale(14),
      marginBottom: scale(12),
      alignItems: 'center',
    },
    emptyIconWrap: {
      width: scale(42),
      height: scale(42),
      borderRadius: scale(21),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F8FAFC',
      marginBottom: scale(8),
    },
    emptyText: {
      color: '#6B7280',
      fontSize: scale(13),
      fontWeight: '600',
      textAlign: 'center',
    },
    paginationContainer: {
      borderRadius: scale(14),
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
      marginTop: scale(20),
      marginBottom: scale(8),
      paddingHorizontal: scale(12),
      paddingVertical: scale(12),
      gap: scale(10),
    },
    paginationSummary: {
      textAlign: 'center',
      color: '#64748B',
      fontSize: scale(12),
      fontWeight: '500',
    },
    paginationControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: scale(10),
    },
    paginationButton: {
      width: scale(38),
      height: scale(38),
      borderRadius: scale(19),
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    paginationButtonDisabled: {
      backgroundColor: '#F8FAFC',
      borderColor: '#F1F5F9',
    },
    pageNumberRow: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: scale(8),
    },
    pageNumberChip: {
      minWidth: scale(34),
      height: scale(34),
      borderRadius: scale(17),
      paddingHorizontal: scale(8),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    pageNumberChipActive: {
      backgroundColor: '#FFEDD5',
      borderColor: '#FDBA74',
    },
    pageNumberText: {
      fontSize: scale(13),
      color: '#475569',
      fontWeight: '600',
    },
    pageNumberTextActive: {
      color: '#C2410C',
      fontWeight: '700',
    },
  });
