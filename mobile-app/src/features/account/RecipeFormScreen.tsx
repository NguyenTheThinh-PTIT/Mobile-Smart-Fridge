import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useResponsive } from '@/core/theme/responsive';
import { Button } from '@/core/base_widgets';
import { axiosClient } from '@/core/network/AxiosClient';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/authSlice';

interface RecipeStep {
  stepNumber: number;
  instruction: string;
}

interface RecipeIngredient {
  foodId: number;
  foodName: string;
  requireQuantity: number;
  unit: string;
}

interface FormRecipe {
  id?: number;
  name: string;
  instructions: string;
  cookTimeMinutes: number;
  difficulty: string;
  steps: RecipeStep[];
  ingredients: RecipeIngredient[];
}

export const RecipeFormScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { scale } = useResponsive();
  const user = useAppSelector(selectUser);

  const [form, setForm] = useState<FormRecipe>({
    name: '',
    instructions: '',
    cookTimeMinutes: 30,
    difficulty: 'Trung bình',
    steps: [],
    ingredients: [],
  });
  const [loading, setLoading] = useState(false);
  const householdId = user?.householdId || 1;
  const mode = route.params?.mode || 'create';
  const existingRecipe = route.params?.recipe;

  useEffect(() => {
    console.log('[RecipeFormScreen] User:', user);
    console.log('[RecipeFormScreen] HouseholdId:', householdId);
    if (existingRecipe) {
      setForm(existingRecipe);
    }
  }, [existingRecipe, householdId, user]);

  const handleAddStep = () => {
    const newStep: RecipeStep = {
      stepNumber: form.steps.length + 1,
      instruction: '',
    };
    setForm({ ...form, steps: [...form.steps, newStep] });
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = form.steps.filter((_, i) => i !== index);
    setForm({
      ...form,
      steps: newSteps.map((s, idx) => ({ ...s, stepNumber: idx + 1 })),
    });
  };

  const handleUpdateStep = (index: number, instruction: string) => {
    const newSteps = [...form.steps];
    newSteps[index].instruction = instruction;
    setForm({ ...form, steps: newSteps });
  };

  const handleAddIngredient = () => {
    navigation.navigate('RecipeIngredientEditor', { onAdd: handleIngredientAdd });
  };

  const handleIngredientAdd = (ingredient: RecipeIngredient) => {
    setForm({
      ...form,
      ingredients: [...form.ingredients, ingredient],
    });
  };

  const handleRemoveIngredient = (index: number) => {
    setForm({
      ...form,
      ingredients: form.ingredients.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên công thức');
      return;
    }

    if (form.ingredients.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng thêm ít nhất 1 nguyên liệu');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: form.name,
        instructions: form.instructions,
        cookTimeMinutes: form.cookTimeMinutes,
        difficulty: form.difficulty,
        householdId,
        source: 'user',
        steps: form.steps,
        ingredients: form.ingredients,
      };

      if (mode === 'create') {
        await axiosClient.post('/recipes', payload);
        Alert.alert('Thành công', 'Công thức đã được tạo');
      } else {
        await axiosClient.put(`/recipes/${form.id}`, payload);
        Alert.alert('Thành công', 'Công thức đã được cập nhật');
      }

      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể lưu công thức');
    } finally {
      setLoading(false);
    }
  };

  const difficulties = ['Dễ', 'Trung bình', 'Khó'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={scale(24)} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === 'create' ? 'Tạo công thức mới' : 'Sửa công thức'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Tên công thức */}
        <View style={styles.section}>
          <Text style={styles.label}>Tên công thức *</Text>
          <TextInput
            style={styles.input}
            placeholder="VD: Mỳ Ý cà chua"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
            placeholderTextColor="#CBD5E1"
          />
        </View>

        {/* Thời gian nấu */}
        <View style={styles.section}>
          <Text style={styles.label}>Thời gian nấu (phút)</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.buttonSmall}
              onPress={() =>
                setForm({
                  ...form,
                  cookTimeMinutes: Math.max(5, form.cookTimeMinutes - 5),
                })
              }
            >
              <Text style={styles.buttonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.timeValue}>{form.cookTimeMinutes}</Text>
            <TouchableOpacity
              style={styles.buttonSmall}
              onPress={() => setForm({ ...form, cookTimeMinutes: form.cookTimeMinutes + 5 })}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Độ khó */}
        <View style={styles.section}>
          <Text style={styles.label}>Độ khó</Text>
          <View style={styles.difficultyRow}>
            {difficulties.map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.difficultyButton,
                  form.difficulty === d && styles.difficultyButtonActive,
                ]}
                onPress={() => setForm({ ...form, difficulty: d })}
              >
                <Text
                  style={[
                    styles.difficultyButtonText,
                    form.difficulty === d && styles.difficultyButtonTextActive,
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Hướng dẫn */}
        <View style={styles.section}>
          <Text style={styles.label}>Hướng dẫn</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Nhập hướng dẫn nấu ăn"
            value={form.instructions}
            onChangeText={(text) => setForm({ ...form, instructions: text })}
            multiline
            placeholderTextColor="#CBD5E1"
          />
        </View>

        {/* Các bước nấu */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Các bước nấu</Text>
            <TouchableOpacity onPress={handleAddStep}>
              <Ionicons name="add-circle-outline" size={scale(20)} color="#F97316" />
            </TouchableOpacity>
          </View>
          {form.steps.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có bước nào. Bấm + để thêm.</Text>
          ) : (
            form.steps.map((step, index) => (
              <View key={index} style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                </View>
                <TextInput
                  style={styles.stepInput}
                  placeholder="Mô tả bước nấu"
                  value={step.instruction}
                  onChangeText={(text) => handleUpdateStep(index, text)}
                  placeholderTextColor="#CBD5E1"
                />
                <TouchableOpacity onPress={() => handleRemoveStep(index)}>
                  <Ionicons name="close-circle-outline" size={scale(20)} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Nguyên liệu */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Nguyên liệu *</Text>
            <TouchableOpacity onPress={handleAddIngredient}>
              <Ionicons name="add-circle-outline" size={scale(20)} color="#F97316" />
            </TouchableOpacity>
          </View>
          {form.ingredients.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có nguyên liệu nào. Bấm + để thêm.</Text>
          ) : (
            form.ingredients.map((ing, index) => (
              <View key={index} style={styles.ingredientCard}>
                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>{ing.foodName}</Text>
                  <Text style={styles.ingredientQty}>
                    {ing.requireQuantity} {ing.unit}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveIngredient(index)}>
                  <Ionicons name="close-circle-outline" size={scale(20)} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Nút lưu */}
        <View style={styles.buttonGroup}>
          <Button
            title={loading ? 'Đang lưu...' : 'Lưu công thức'}
            onPress={handleSave}
            disabled={loading}
          />
          <Button
            title="Hủy"
            onPress={() => navigation.goBack()}
            style={{ backgroundColor: '#E2E8F0', marginTop: 8 }}
            textStyle={{ color: '#64748B' }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F6' },
  content: { padding: 16, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 8 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttonSmall: {
    backgroundColor: '#F97316',
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  timeValue: { fontSize: 16, fontWeight: '600', color: '#0F172A', flex: 1, textAlign: 'center' },
  difficultyRow: { flexDirection: 'row', gap: 8 },
  difficultyButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  difficultyButtonActive: { backgroundColor: '#FED7AA', borderColor: '#F97316' },
  difficultyButtonText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  difficultyButtonTextActive: { color: '#F97316' },
  emptyText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: { fontSize: 12, fontWeight: '700', color: '#F97316' },
  stepInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingHorizontal: 8,
  },
  ingredientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ingredientInfo: { flex: 1 },
  ingredientName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  ingredientQty: { fontSize: 12, color: '#64748B', marginTop: 2 },
  buttonGroup: { marginTop: 20 },
});
