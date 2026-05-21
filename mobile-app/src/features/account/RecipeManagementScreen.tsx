import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/authSlice';
import { useResponsive } from '@/core/theme/responsive';
import { AppHeader, Button } from '@/core/base_widgets';
import { axiosClient } from '@/core/network/AxiosClient';

interface UserRecipe {
  id: number;
  name: string;
  cookTimeMinutes?: number;
  difficulty?: string;
  createdBy?: number;
  createdDate?: string;
}

export const RecipeManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { scale } = useResponsive();
  const user = useAppSelector(selectUser);
  
  const [recipes, setRecipes] = useState<UserRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get household ID from Redux user object
  const householdId = user?.householdId ? parseInt(user.householdId, 10) : null;

  // Load recipes
  const loadRecipes = useCallback(async () => {
    if (!householdId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Query recipes with source='user' and matching household_id
      const response = await axiosClient.get<any>('/recipes/household', {
        params: { householdId, source: 'user' }
      });
      
      setRecipes(response?.data || []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải công thức');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  const handleDeleteRecipe = (recipeId: number, recipeName: string) => {
    Alert.alert(
      'Xóa công thức',
      `Bạn có chắc muốn xóa "${recipeName}"?`,
      [
        { text: 'Hủy', onPress: () => {}, style: 'cancel' },
        {
          text: 'Xóa',
          onPress: async () => {
            try {
              await axiosClient.delete(`/recipes/${recipeId}`);
              Alert.alert('Thành công', 'Công thức đã được xóa');
              loadRecipes();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể xóa công thức');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleEditRecipe = (recipe: UserRecipe) => {
    navigation.navigate('RecipeForm', { recipe, mode: 'edit' });
  };

  const handleAddRecipe = () => {
    navigation.navigate('RecipeForm', { mode: 'create' });
  };

  const renderRecipeItem = ({ item }: { item: UserRecipe }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => handleEditRecipe(item)}
    >
      <View style={styles.recipeHeader}>
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeName}>{item.name}</Text>
          <View style={styles.recipeMetaRow}>
            {item.cookTimeMinutes && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={scale(14)} color="#64748B" />
                <Text style={styles.metaText}>{item.cookTimeMinutes} phút</Text>
              </View>
            )}
            {item.difficulty && (
              <View style={styles.metaItem}>
                <Ionicons name="flame-outline" size={scale(14)} color="#64748B" />
                <Text style={styles.metaText}>{item.difficulty}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteRecipe(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={scale(20)} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading && recipes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppHeader />

        <Text style={styles.title}>Quản lý công thức</Text>
        <Text style={styles.subtitle}>Tạo, sửa hoặc xoá công thức nấu ăn của gia đình</Text>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={scale(20)} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {recipes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="restaurant-outline" size={scale(48)} color="#CBD5E1" />
            <Text style={styles.emptyText}>Chưa có công thức nào</Text>
            <Text style={styles.emptySubtext}>Tạo công thức đầu tiên của gia đình bạn</Text>
          </View>
        ) : (
          <FlatList
            data={recipes}
            renderItem={renderRecipeItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        )}

        <Button
          title="➕ Thêm công thức mới"
          onPress={handleAddRecipe}
          style={styles.addBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F6' },
  content: { padding: 16, paddingBottom: 24 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 22, color: '#64748B', marginBottom: 16 },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: { fontSize: 13, color: '#DC2626', marginLeft: 8, flex: 1 },
  emptyBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748B', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  recipeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recipeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recipeInfo: { flex: 1 },
  recipeName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  recipeMetaRow: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#64748B' },
  deleteBtn: { padding: 6 },
  addBtn: {
    marginTop: 16,
    backgroundColor: '#F97316',
    paddingVertical: 14,
    borderRadius: 12,
  },
});
