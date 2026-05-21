import React from 'react';
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/core/base_widgets';
import { useResponsive } from '@/core/theme/responsive';
import { recipesApi, RecipeSearchItem } from '@/features/recipes/api';

interface SelectedRecipe {
  recipe_id: number;
  recipe_name: string;
  cook_time_minutes: number;
  calories_kcal?: number;
  difficulty?: string;
  warning_message?: string | null;
}

const DEFAULT_HOUSEHOLD_ID = Number(process.env.EXPO_PUBLIC_DEFAULT_HOUSEHOLD_ID || 1);

export const MealPlanRecipeSearchScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { scale } = useResponsive();
  const styles = React.useMemo(() => createStyles(scale), [scale]);

  const [searchText, setSearchText] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<RecipeSearchItem[]>([]);

  React.useEffect(() => {
    const keyword = searchText.trim();
    if (!keyword) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
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

        setResults(strictResults);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  const onPickRecipe = (item: RecipeSearchItem) => {
    const selectedRecipes = (route?.params?.selectedRecipes as SelectedRecipe[] | undefined) ?? [];
    const existed = selectedRecipes.some((recipe) => recipe.recipe_id === item.recipe_id);

    const nextRecipes = existed
      ? selectedRecipes
      : [
          ...selectedRecipes,
          {
            recipe_id: item.recipe_id,
            recipe_name: item.recipe_name,
            cook_time_minutes: item.cook_time_minutes,
            calories_kcal: item.calories_kcal,
            difficulty: item.difficulty,
            warning_message: item.warning_message,
          },
        ];

    navigation.navigate('MealPlanPending', {
      mealType: route?.params?.mealType,
      mealTypeKey: route?.params?.mealTypeKey,
      date: route?.params?.date,
      selectedDateIso: route?.params?.selectedDateIso,
      mealPlan: route?.params?.mealPlan,
      state: route?.params?.state,
      selectedRecipes: nextRecipes,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <AppHeader marginBottom={scale(16)} leftAction="back" />

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

        {loading ? <Text style={styles.helperText}>Đang tìm món ăn...</Text> : null}

        <FlatList
          data={results}
          keyExtractor={(item) => String(item.recipe_id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.recipeCard} activeOpacity={0.9} onPress={() => onPickRecipe(item)}>
              <View style={styles.imagePlaceholder}>
                <Ionicons name="restaurant-outline" size={scale(22)} color="#FFFFFF" />
              </View>

              <Text style={styles.recipeTitle}>{item.recipe_name}</Text>
              <Text style={styles.recipeSub} numberOfLines={2}>
                {item.warning_message || `Độ khó: ${item.difficulty || 'Chưa rõ'}`}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={scale(15)} color="#FF7622" />
                  <Text style={styles.metaText}>{item.cook_time_minutes} min</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="add-circle-outline" size={scale(15)} color="#FF7622" />
                  <Text style={styles.metaText}>Chọn món</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            searchText.trim().length > 0 && !loading ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Không tìm thấy món phù hợp</Text>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Nhập từ khóa để tìm món ăn</Text>
              </View>
            )
          }
        />
      </View>
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
      flex: 1,
      paddingHorizontal: scale(24),
      paddingTop: scale(16),
    },
    searchWrap: {
      height: scale(54),
      borderRadius: scale(10),
      backgroundColor: '#F6F6F6',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: scale(16),
      marginBottom: scale(12),
    },
    searchInput: {
      marginLeft: scale(10),
      flex: 1,
      color: '#32343E',
      fontSize: scale(14),
      paddingVertical: 0,
    },
    helperText: {
      fontSize: scale(13),
      color: '#64748B',
      marginBottom: scale(8),
    },
    listContent: {
      paddingBottom: scale(20),
      gap: scale(14),
    },
    recipeCard: {
      marginBottom: scale(6),
    },
    imagePlaceholder: {
      height: scale(120),
      borderRadius: scale(12),
      backgroundColor: '#C4C4C4',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scale(8),
    },
    recipeTitle: {
      fontSize: scale(18),
      lineHeight: scale(22),
      color: '#181C2E',
      marginBottom: scale(4),
      fontWeight: '600',
    },
    recipeSub: {
      fontSize: scale(13),
      lineHeight: scale(16),
      color: '#4B5563',
      fontStyle: 'italic',
      marginBottom: scale(6),
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(14),
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(5),
    },
    metaText: {
      fontSize: scale(13),
      color: '#181C2E',
    },
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: scale(20),
    },
    emptyText: {
      color: '#64748B',
      fontSize: scale(14),
      fontWeight: '600',
    },
  });
