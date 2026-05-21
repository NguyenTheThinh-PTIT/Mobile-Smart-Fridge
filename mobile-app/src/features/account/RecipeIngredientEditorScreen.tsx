import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useResponsive } from '@/core/theme/responsive';
import { AppHeader, Button } from '@/core/base_widgets';
import { axiosClient } from '@/core/network/AxiosClient';

interface Food {
  id: number;
  name: string;
  categoryId?: number;
}

interface SelectedIngredient {
  foodId: number;
  foodName: string;
  requireQuantity: number;
  unit: string;
}

export const RecipeIngredientEditorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { scale } = useResponsive();

  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('g');

  const units = ['g', 'ml', 'cốc', 'thìa', 'muỗng', 'cái', 'bó', 'chiếc'];
  const onAdd = route.params?.onAdd;

  useEffect(() => {
    loadFoods();
  }, []);

  const loadFoods = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get<any>('/foods');
      const foodList = response?.data || [];
      setFoods(foodList);
      setFilteredFoods(foodList);
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể tải danh sách nguyên liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.trim() === '') {
      setFilteredFoods(foods);
    } else {
      const filtered = foods.filter((food) =>
        food.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredFoods(filtered);
    }
  };

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
  };

  const handleAddIngredient = () => {
    if (!selectedFood) {
      Alert.alert('Lỗi', 'Vui lòng chọn nguyên liệu');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số lượng hợp lệ');
      return;
    }

    const ingredient: SelectedIngredient = {
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      requireQuantity: qty,
      unit,
    };

    if (onAdd) {
      onAdd(ingredient);
    }

    navigation.goBack();
  };

  const renderFoodItem = ({ item }: { item: Food }) => (
    <TouchableOpacity
      style={[
        styles.foodItem,
        selectedFood?.id === item.id && styles.foodItemActive,
      ]}
      onPress={() => handleSelectFood(item)}
    >
      <View style={styles.foodItemContent}>
        <Ionicons
          name="restaurant-outline"
          size={scale(18)}
          color={selectedFood?.id === item.id ? '#F97316' : '#64748B'}
        />
        <Text
          style={[
            styles.foodName,
            selectedFood?.id === item.id && styles.foodNameActive,
          ]}
        >
          {item.name}
        </Text>
      </View>
      {selectedFood?.id === item.id && (
        <Ionicons name="checkmark-circle" size={scale(20)} color="#F97316" />
      )}
    </TouchableOpacity>
  );

  if (loading) {
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={scale(24)} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn nguyên liệu</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={scale(18)} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm nguyên liệu..."
            value={searchText}
            onChangeText={handleSearch}
            placeholderTextColor="#CBD5E1"
          />
        </View>

        {/* Food List */}
        <Text style={styles.sectionLabel}>Danh sách nguyên liệu ({filteredFoods.length})</Text>
        <FlatList
          data={filteredFoods}
          renderItem={renderFoodItem}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />

        {/* Selected Food Details */}
        {selectedFood && (
          <View style={styles.selectedBox}>
            <Text style={styles.selectedTitle}>Thông tin nguyên liệu</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tên:</Text>
              <Text style={styles.detailValue}>{selectedFood.name}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Số lượng:</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.quantityBtn}
                  onPress={() =>
                    setQuantity(
                      String(Math.max(0, parseFloat(quantity || '0') - 1))
                    )
                  }
                >
                  <Text style={styles.quantityBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.quantityInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={styles.quantityBtn}
                  onPress={() =>
                    setQuantity(
                      String(parseFloat(quantity || '0') + 1)
                    )
                  }
                >
                  <Text style={styles.quantityBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Đơn vị:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.unitScroll}
              >
                {units.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.unitBtn,
                      unit === u && styles.unitBtnActive,
                    ]}
                    onPress={() => setUnit(u)}
                  >
                    <Text
                      style={[
                        styles.unitBtnText,
                        unit === u && styles.unitBtnTextActive,
                      ]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.footer}>
        <Button
          title="Thêm nguyên liệu"
          onPress={handleAddIngredient}
          disabled={!selectedFood}
        />
        <Button
          title="Hủy"
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: '#E2E8F0', marginTop: 8 }}
          textStyle={{ color: '#64748B' }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  content: { padding: 16, paddingBottom: 200 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, paddingVertical: 10, marginLeft: 8, fontSize: 14, color: '#0F172A' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  foodItemActive: { backgroundColor: '#FEF3C7', borderColor: '#F97316' },
  foodItemContent: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  foodName: { fontSize: 14, color: '#0F172A', fontWeight: '500' },
  foodNameActive: { color: '#F97316', fontWeight: '600' },
  selectedBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  selectedTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  detailRow: { marginBottom: 12 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  detailValue: { fontSize: 14, color: '#0F172A', fontWeight: '500' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  quantityInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitScroll: { flexDirection: 'row', gap: 6 },
  unitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitBtnActive: { backgroundColor: '#FED7AA', borderColor: '#F97316' },
  unitBtnText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  unitBtnTextActive: { color: '#F97316' },
  footer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
});
