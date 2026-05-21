import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '@/core/theme/responsive';
import { ErrorDisplay } from '@/core/base_widgets/ErrorDisplay';
import { LoadingIndicator } from '@/core/base_widgets/LoadingIndicator';
import { AppHeader } from '@/core/base_widgets';
import { recipesApi, SuggestedRecipe, RecipeSearchItem, RecipeDetailParams } from './api';

type SuggestionTab = 'ready' | 'needToBuy';

const DEFAULT_HOUSEHOLD_ID = Number(process.env.EXPO_PUBLIC_DEFAULT_HOUSEHOLD_ID || 1);
const DEFAULT_LAT = Number(process.env.EXPO_PUBLIC_DEFAULT_LAT || 10.7769);
const DEFAULT_LON = Number(process.env.EXPO_PUBLIC_DEFAULT_LON || 106.7009);
const DEFAULT_MEAL_TYPE = (process.env.EXPO_PUBLIC_DEFAULT_MEAL_TYPE || 'dinner') as
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack';

const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getCaloriesLevel = (calories: number): 'Thấp' | 'Trung bình' | 'Cao' => {
  if (calories < 400) {
    return 'Thấp';
  }
  if (calories < 650) {
    return 'Trung bình';
  }
  return 'Cao';
};

export const RecipesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { scale } = useResponsive();
  const [activeTab, setActiveTab] = React.useState<SuggestionTab>('ready');
  const [searchText, setSearchText] = React.useState('');
  const [showAllMode, setShowAllMode] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [readyRecipes, setReadyRecipes] = React.useState<SuggestedRecipe[]>([]);
  const [needToBuyRecipes, setNeedToBuyRecipes] = React.useState<SuggestedRecipe[]>([]);
  const [allReadyRecipes, setAllReadyRecipes] = React.useState<SuggestedRecipe[]>([]);
  const [allNeedToBuyRecipes, setAllNeedToBuyRecipes] = React.useState<SuggestedRecipe[]>([]);
  const [allModeLoading, setAllModeLoading] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<RecipeSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadSuggestions = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await recipesApi.getSuggestions({
        householdId: DEFAULT_HOUSEHOLD_ID,
        mealType: DEFAULT_MEAL_TYPE,
        lat: DEFAULT_LAT,
        lon: DEFAULT_LON,
      });

      setReadyRecipes(response.fully_covered);
      setNeedToBuyRecipes(response.partially_covered);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải gợi ý món ăn lúc này.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const openRecipeDetail = React.useCallback(
    (params: RecipeDetailParams) => {
      const parentNav = navigation?.getParent?.();
      if (parentNav?.navigate) {
        parentNav.navigate('RecipeDetail', params);
        return;
      }
      navigation.navigate('RecipeDetail', params);
    },
    [navigation]
  );

  const currentRecipes = activeTab === 'ready' ? readyRecipes : needToBuyRecipes;
  const currentAllRecipes = activeTab === 'ready' ? allReadyRecipes : allNeedToBuyRecipes;
  const displayedRecipes = showAllMode ? currentAllRecipes : currentRecipes;
  const pageSize = showAllMode ? 6 : 5;
  const totalPages = Math.max(1, Math.ceil(displayedRecipes.length / pageSize));
  const normalizedPage = Math.min(currentPage, totalPages);
  const currentRecipesPage = displayedRecipes.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);
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
  const isSearchMode = normalizeSearchText(searchText).length > 0;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, showAllMode]);

  const loadAllRecipeCatalog = React.useCallback(async () => {
    try {
      setAllModeLoading(true);
      const response = await recipesApi.getAllRecipeCatalog({
        householdId: DEFAULT_HOUSEHOLD_ID,
        mealType: DEFAULT_MEAL_TYPE,
        lat: DEFAULT_LAT,
        lon: DEFAULT_LON,
      });

      setAllReadyRecipes(response.fully_covered);
      setAllNeedToBuyRecipes(response.partially_covered);
    } catch {
      setAllReadyRecipes([]);
      setAllNeedToBuyRecipes([]);
    } finally {
      setAllModeLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!showAllMode) {
      return;
    }

    if (allReadyRecipes.length > 0 || allNeedToBuyRecipes.length > 0) {
      return;
    }

    loadAllRecipeCatalog();
  }, [showAllMode, allReadyRecipes.length, allNeedToBuyRecipes.length, loadAllRecipeCatalog]);

  React.useEffect(() => {
    const keyword = searchText.trim();
    if (!keyword) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const response = await recipesApi.searchRecipes({
          householdId: DEFAULT_HOUSEHOLD_ID,
          query: keyword,
          limit: 30,
        });

        const normalizedKeyword = keyword.toLowerCase();
        const isNumericKeyword = /^\d+$/.test(keyword);

        const strictResults = response.results.filter((item) => {
          const recipeName = (item.recipe_name ?? '').toLowerCase();
          if (recipeName.includes(normalizedKeyword)) {
            return true;
          }

          if (isNumericKeyword && String(item.recipe_id).includes(keyword)) {
            return true;
          }

          return false;
        });

        setSearchResults(strictResults);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText]);

  const styles = React.useMemo(() => createStyles(scale), [scale]);

  if (loading) {
    return <LoadingIndicator message="Đang tải gợi ý món ăn..." color="#F97316" />;
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Không tải được gợi ý"
        message={error}
        onRetry={loadSuggestions}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader />

        <View style={styles.greetingWrap}>
          <Text style={styles.greetingEyebrow}>Khởi đầu ngày mới</Text>
          <Text style={styles.greeting}>Chào buổi sáng</Text>
          <View style={styles.greetingUnderline} />
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={scale(16)} color="#A0A5BA" />
          <TextInput
            placeholder="Tìm món ăn"
            placeholderTextColor="#A0A5BA"
            value={searchText}
            onChangeText={setSearchText}
            style={styles.searchInput}
          />
        </View>

        {!isSearchMode ? (
          <View style={styles.tabRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.tabButton,
                activeTab === 'ready' ? styles.tabButtonActive : styles.tabButtonInactive,
              ]}
              onPress={() => setActiveTab('ready')}
            >
              <View style={styles.tabIconCircle}>
                <Ionicons name="restaurant-outline" size={scale(18)} color="#32343E" />
              </View>
              <Text style={styles.tabLabel}>Sẵn sàng</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.tabButton,
                activeTab === 'needToBuy' ? styles.tabButtonActive : styles.tabButtonInactive,
              ]}
              onPress={() => setActiveTab('needToBuy')}
            >
              <View style={styles.tabIconCircle}>
                <Ionicons name="cart-outline" size={scale(18)} color="#32343E" />
              </View>
              <Text style={styles.tabLabel}>Cần mua</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!isSearchMode ? (
          <View style={styles.viewAllWrap}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.viewAllButton}
              onPress={() => setShowAllMode((prev) => !prev)}
            >
              <Text style={styles.viewAllText}>{showAllMode ? 'Món ăn được gợi ý' : 'Xem toàn bộ món ăn'}</Text>
              <Ionicons
                name={showAllMode ? 'chevron-up-outline' : 'chevron-forward-outline'}
                size={scale(16)}
                color="#334155"
              />
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>
          {isSearchMode ? 'Kết quả tìm trong toàn bộ món ăn' : showAllMode ? 'Tất cả món ăn' : 'Món ăn phù hợp'}
        </Text>

        {isSearchMode && searchLoading ? (
          <View style={styles.searchingBox}>
            <Text style={styles.searchingText}>Đang tìm món ăn trong cơ sở dữ liệu...</Text>
          </View>
        ) : null}

        {!isSearchMode && showAllMode && allModeLoading ? (
          <View style={styles.searchingBox}>
            <Text style={styles.searchingText}>Đang tải toàn bộ món ăn trong cơ sở dữ liệu...</Text>
          </View>
        ) : null}

        {isSearchMode
          ? searchResults.map((recipe) => (
              <TouchableOpacity
                key={`search-${recipe.recipe_id}`}
                activeOpacity={0.9}
                style={styles.recipeCard}
                onPress={() =>
                  openRecipeDetail({
                    recipeId: recipe.recipe_id,
                    recipeName: recipe.recipe_name,
                    cookTimeMinutes: recipe.cook_time_minutes,
                    caloriesKcal: recipe.calories_kcal,
                    difficulty: recipe.difficulty,
                    cuisineType: recipe.cuisine_type,
                    source: 'search',
                    warningMessage: recipe.warning_message,
                    availableIngredients: [],
                    missingIngredients: [],
                    reason: '',
                  })
                }
              >
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="restaurant-outline" size={scale(28)} color="#FFFFFF" />
                </View>

                <Text style={styles.recipeTitle}>{recipe.recipe_name}</Text>
                  <Text style={[styles.recipeSub, recipe.warning_message ? styles.recipeSubWarning : null]} numberOfLines={2}>
                    {recipe.warning_message || `Độ khó: ${recipe.difficulty || 'Chưa rõ'}`}
                  </Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="flame-outline" size={scale(16)} color="#FF7622" />
                    <Text style={styles.metaText}>
                      {`${Math.max(0, recipe.calories_kcal ?? 450)} kcal - ${getCaloriesLevel(
                        Math.max(0, recipe.calories_kcal ?? 450)
                      )}`}
                    </Text>
                  </View>
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
          : currentRecipesPage.map((recipe) => {
              const availableFoods = (
                Array.isArray(recipe.available_ingredients) && recipe.available_ingredients.length > 0
                  ? recipe.available_ingredients
                  : recipe.uses_expiring_ingredients ?? []
              ).slice(0, 3);
              const missingFoods = (recipe.missing_ingredients ?? [])
                .map((item) => item.food_name)
                .slice(0, 3);

              return (
                <TouchableOpacity
                  key={String(recipe.recipe_id)}
                  activeOpacity={0.9}
                  style={styles.recipeCard}
                  onPress={() =>
                    openRecipeDetail({
                      recipeId: recipe.recipe_id,
                      recipeName: recipe.recipe_name,
                      cookTimeMinutes: recipe.cook_time_minutes,
                      caloriesKcal: recipe.calories_kcal,
                      difficulty: recipe.difficulty,
                      cuisineType: recipe.cuisine_type,
                      source: activeTab,
                      availableIngredients: recipe.available_ingredients ?? [],
                      missingIngredients: (recipe.missing_ingredients ?? []).map((item) => item.food_name),
                      reason: recipe.reason,
                    })
                  }
                >
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={scale(28)} color="#FFFFFF" />
                  </View>

                  <Text style={styles.recipeTitle}>{recipe.recipe_name}</Text>

                  {recipe.warning_message ? (
                    <Text style={styles.recipeSubWarning} numberOfLines={2}>
                      {recipe.warning_message}
                    </Text>
                  ) : null}

                  <View style={styles.ingredientsWrap}>
                    {availableFoods.length > 0 ? (
                      <View style={styles.ingredientRow}>
                        <Text style={styles.ingredientLabel}>Có sẵn: </Text>
                        <Text style={styles.availableText}>{availableFoods.join(' - ')}</Text>
                      </View>
                    ) : null}

                    {missingFoods.length > 0 ? (
                      <View style={styles.ingredientRow}>
                        <Text style={styles.ingredientLabel}>Thiếu: </Text>
                        <Text style={styles.missingText}>{missingFoods.join(' - ')}</Text>
                      </View>
                    ) : null}

                    {availableFoods.length === 0 && missingFoods.length === 0 ? (
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
                        {`${Math.max(0, recipe.calories_kcal ?? 450)} kcal - ${getCaloriesLevel(
                          Math.max(0, recipe.calories_kcal ?? 450)
                        )}`}
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={scale(16)} color="#FF7622" />
                      <Text style={styles.metaText}>{recipe.cook_time_minutes} min</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

        {!isSearchMode && displayedRecipes.length > pageSize ? (
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
                    key={`page-${activeTab}-${pageNumber}`}
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

        {!(isSearchMode ? searchResults.length : displayedRecipes.length) && !searchLoading && !allModeLoading ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="file-tray-outline" size={scale(24)} color="#94A3B8" />
            </View>
            <Text style={styles.emptyText}>Không có món ăn phù hợp</Text>
          </View>
        ) : null}

        {/* <Button
          title="Làm mới gợi ý"
          onPress={loadSuggestions}
          size="large"
          style={styles.refreshBtn}
          textStyle={styles.refreshText}
        />mới */}

      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (scale: (size: number) => number) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    content: { paddingHorizontal: scale(24), paddingTop: scale(16), paddingBottom: scale(24) },
    greetingWrap: {
      marginBottom: scale(16),
    },
    greetingEyebrow: {
      fontSize: scale(12),
      fontWeight: '700',
      color: '#FF7622',
      letterSpacing: scale(0.6),
      textTransform: 'uppercase',
      marginBottom: scale(2),
    },
    greeting: {
      fontSize: scale(26),
      lineHeight: scale(32),
      color: '#1E1D1D',
      fontWeight: '800',
      fontStyle: 'italic',
      letterSpacing: scale(0.3),
      textShadowColor: 'rgba(255,118,34,0.16)',
      textShadowOffset: { width: 0, height: scale(4) },
      textShadowRadius: scale(10),
    },
    greetingUnderline: {
      width: scale(82),
      height: scale(4),
      borderRadius: scale(999),
      marginTop: scale(6),
      backgroundColor: '#FF7622',
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
    tabRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scale(18),
      gap: scale(12),
    },
    tabButton: {
      flex: 1,
      height: scale(58),
      borderRadius: scale(39),
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: scale(10),
    },
    tabButtonActive: {
      backgroundColor: '#FFD27C',
      shadowColor: '#FFB74D',
      shadowOffset: { width: 0, height: scale(8) },
      shadowOpacity: 0.28,
      shadowRadius: scale(14),
      elevation: scale(5),
    },
    tabButtonInactive: {
      backgroundColor: '#FFFFFF',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: scale(6) },
      shadowOpacity: 0.12,
      shadowRadius: scale(12),
      elevation: scale(4),
    },
    tabIconCircle: {
      width: scale(42),
      height: scale(42),
      borderRadius: scale(21),
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: scale(10),
    },
    tabLabel: {
      fontSize: scale(14),
      fontWeight: '700',
      color: '#32343E',
    },
    sectionTitle: {
      fontSize: scale(24),
      lineHeight: scale(30),
      fontWeight: '800',
      textTransform: 'none',
      color: '#181C2E',
      letterSpacing: scale(0.25),
      textShadowColor: 'rgba(255,118,34,0.14)',
      textShadowOffset: { width: 0, height: scale(3) },
      textShadowRadius: scale(10),
      marginBottom: scale(14),
    },
    viewAllWrap: {
      marginBottom: scale(10),
      alignItems: 'flex-start',
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(6),
      borderRadius: scale(999),
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: scale(12),
      paddingVertical: scale(8),
    },
    viewAllText: {
      color: '#334155',
      fontSize: scale(13),
      lineHeight: scale(16),
      fontWeight: '700',
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
      textTransform: 'none',
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
    recipeSubWarning: {
      fontSize: scale(13),
      lineHeight: scale(18),
      color: '#DC2626',
      fontWeight: '700',
      marginBottom: scale(8),
    },
    ingredientsWrap: {
      marginBottom: scale(8),
      gap: scale(2),
    },
    ingredientRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    ingredientLabel: {
      fontSize: scale(12),
      color: '#94A3B8',
      fontWeight: '400',
    },
    availableText: {
      fontSize: scale(12),
      color: '#86EFAC',
      fontWeight: '500',
    },
    missingText: {
      fontSize: scale(12),
      color: '#FDA4AF',
      fontWeight: '500',
    },
    unknownIngredientText: {
      fontSize: scale(13),
      color: '#64748B',
      fontWeight: '600',
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
    searchingBox: {
      borderRadius: scale(10),
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: scale(14),
      marginBottom: scale(12),
      backgroundColor: '#FFF7ED',
    },
    searchingText: {
      color: '#9A3412',
      fontSize: scale(13),
      fontWeight: '600',
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
    refreshBtn: {
      backgroundColor: '#FF7622',
      borderRadius: scale(12),
      marginTop: scale(4),
    },
    refreshText: {
      color: '#FFFFFF',
      fontSize: scale(14),
      fontWeight: '700',
    },
    paginationWrap: {
      marginTop: scale(6),
      marginBottom: scale(10),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(10),
    },
    pageNavButton: {
      width: scale(32),
      height: scale(32),
      borderRadius: scale(16),
      borderWidth: 1,
      borderColor: '#E2E8F0',
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
      flexWrap: 'wrap',
      gap: scale(6),
      justifyContent: 'center',
      maxWidth: '72%',
    },
    pageDot: {
      minWidth: scale(30),
      height: scale(30),
      borderRadius: scale(15),
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: scale(9),
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageDotActive: {
      borderColor: '#FF7622',
      backgroundColor: '#FF7622',
    },
    pageDotText: {
      color: '#334155',
      fontSize: scale(12),
      lineHeight: scale(15),
      fontWeight: '700',
    },
    pageDotTextActive: {
      color: '#FFFFFF',
    },
  });
