import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Platform,
  Image,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { ActionSuccessPopup } from './components/ActionSuccessPopup';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { InventoryFood, InventoryFoodInput } from './InventoryContext';
import { useInventory } from './InventoryContext';
import { useResponsive } from '@/core/theme/responsive';

// Top-level constants
const CATEGORIES = ['Rau củ quả', 'Thịt', 'Sữa & Bơ', 'Hải sản', 'Đồ khô'] as const;
const UNITS = ['kg', 'g', 'Hộp', 'Lít', 'Chai'] as const;

const buildInitialForm = (paramsItem?: Partial<InventoryFood>): InventoryFoodInput => ({
  name: paramsItem?.name ?? 'Cà chua',
  category: paramsItem?.category ?? 'Rau củ quả',
  quantity: paramsItem?.quantity ? Number(paramsItem.quantity) : 0,
  unit: paramsItem?.unit ?? 'kg',
  expiryDate: paramsItem?.expiryDate ?? '',
});

const TAB_BAR_STYLE = {
  height: 68,
  paddingBottom: 10,
  paddingTop: 8,
  borderTopColor: '#E2E8F0',
} as const;

// Navigation types
type RootStackParamList = {
  FoodForm: { mode: 'add' | 'edit'; foodId?: string; item?: Partial<InventoryFood> };
};
type NavigationProp = StackNavigationProp<RootStackParamList, 'FoodForm'>;
type RoutePropType = RouteProp<RootStackParamList, 'FoodForm'>;

const FoodFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { mode = 'add', foodId, item: paramsItem } = route.params || {};
  const { getFoodById, addFood, updateFood, deleteFood } = useInventory();
  const [form, setForm] = useState(() => buildInitialForm(paramsItem));
  const [image, setImage] = useState('');
  const [existingItem, setExistingItem] = useState<InventoryFood | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expiryError, setExpiryError] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Cập nhật thành công!');
  const [successMessage, setSuccessMessage] = useState('Thông tin thực phẩm đã được lưu lại trong kho của bạn.');
  const [deleteVisible, setDeleteVisible] = useState(false);
  const { scale, fontScale } = useResponsive();
  const styles = useMemo(() => createStyles(scale), [scale]);
  const textInputMaxFontSizeMultiplier = Math.max(1.2, Math.min(fontScale, 1.8));
  const foodNameForDelete = existingItem?.name ?? form.name;

  useEffect(() => {
    if (mode === 'edit' && foodId) {
      const item = getFoodById(foodId);
      if (item) {
        setExistingItem(item);
        setForm(buildInitialForm(item));
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy thực phẩm');
        navigation.goBack();
      }
    }
  }, [mode, foodId, getFoodById, navigation]);

  useEffect(() => {
    const parent = navigation.getParent?.();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => {
      parent?.setOptions({ tabBarStyle: TAB_BAR_STYLE });
    };
  }, [navigation]);

  const submitLabel = mode === 'add' ? 'Thêm vào kho' : 'Lưu thay đổi';
  const title = mode === 'add' ? 'Thêm thực phẩm' : 'Chỉnh sửa thực phẩm';

  const onChangeField = useCallback((field: keyof InventoryFoodInput, value: string) => {
    if (field === 'expiryDate' && value.trim()) {
      setExpiryError(false);
    }
    setForm((prev) => ({ ...prev, [field]: field === 'quantity' ? value : value }));
  }, []);

  const rotateCategory = useCallback(() => {
    const index = CATEGORIES.indexOf(form.category as any);
    const next = CATEGORIES[(index + 1) % CATEGORIES.length];
    setForm((prev) => ({ ...prev, category: next }));
  }, [form.category]);

  const rotateUnit = useCallback(() => {
    const index = UNITS.indexOf(form.unit as any);
    const next = UNITS[(index + 1) % UNITS.length];
    setForm((prev) => ({ ...prev, unit: next }));
  }, [form.unit]);

  // Validate form: tên, số lượng > 0, ngày hết hạn hợp lệ, đơn vị, loại
  const validate = useCallback(() => {
    const nameValid = (form.name || '').trim().length > 0;
    const quantityValid = parseFloat(String(form.quantity).replace(',', '.')) > 0;
    const expiryValid = !!(form.expiryDate || '').trim();
    
    setExpiryError(!expiryValid);
    
    if (!nameValid) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên thực phẩm');
      return false;
    }
    if (!quantityValid) {
      Alert.alert('Lỗi', 'Số lượng phải lớn hơn 0');
      return false;
    }
    if (!expiryValid) {
      return false;
    }
    return true;
  }, [form]);

  const toPayload = useCallback((): InventoryFoodInput => ({
    name: form.name.trim() || 'Thực phẩm mới',
    category: form.category,
    quantity: parseFloat(String(form.quantity).replace(',', '.')) || 0,
    unit: form.unit,
    expiryDate: (form.expiryDate || '').trim(),
  }), [form]);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && selectedDate) {
        // User confirmed selection
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const year = selectedDate.getFullYear();
        const formatted = `${day}/${month}/${year}`;
        setForm((prev) => ({ ...prev, expiryDate: formatted }));
        setExpiryError(false);
      }
      setShowDatePicker(false);
    } else {
      // iOS: update on every change
      if (selectedDate) {
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const year = selectedDate.getFullYear();
        const formatted = `${day}/${month}/${year}`;
        setForm((prev) => ({ ...prev, expiryDate: formatted }));
        setExpiryError(false);
      }
    }
  }, []);

  const parseDate = useCallback((dateStr: string): Date => {
    const [d, m, y] = dateStr.split('/').map(Number);
    return new Date(y, m - 1, d);
  }, []);

  const handleImagePick = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền', 'Vui lòng cấp quyền thư viện ảnh');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    try {
      const payload = toPayload();
      if (mode === 'add') {
        addFood(payload);
        setSuccessTitle('Thêm thành công!');
        setSuccessMessage('Thực phẩm đã được thêm vào kho.');
      } else {
        if (foodId) updateFood(foodId, payload);
        setSuccessTitle('Cập nhật thành công!');
        setSuccessMessage('Thông tin đã được cập nhật.');
      }
      setSuccessVisible(true);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu. Vui lòng thử lại.');
    }
  }, [validate, toPayload, mode, foodId, addFood, updateFood]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!foodId) return;
    setDeleteVisible(false);
    deleteFood(foodId);
    Alert.alert('Đã xóa', 'Thực phẩm đã được xóa khỏi kho.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }, [foodId, deleteFood, navigation]);

  const handleContinueAdd = useCallback(() => {
    setSuccessVisible(false);
    setForm(buildInitialForm());
    setImage('');
  }, []);

  if (mode === 'edit' && foodId && !existingItem) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Photo picker */}
        <TouchableOpacity style={styles.photoBox} onPress={handleImagePick}>
          {image ? (
            <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} />
          ) : (
            <Ionicons name="camera-outline" size={scale(32)} color="#64748B" />
          )}
        </TouchableOpacity>
        <Text style={styles.changePhoto}>Đổi ảnh (tùy chọn)</Text>

        {/* Form fields */}
        <Text style={styles.label}>Tên thực phẩm</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(v) => onChangeField('name', v)}
          placeholder="Nhập tên thực phẩm..."
          maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
        />

        <Text style={styles.label}>Loại</Text>
        <TouchableOpacity style={styles.selectInput} onPress={rotateCategory}>
          <Text style={styles.selectText}>{form.category}</Text>
          <Ionicons name="chevron-down" size={scale(20)} color="#94A3B8" />
        </TouchableOpacity>

        <Text style={styles.batchTitle}>Số lượng</Text>
        <View style={styles.rowFields}>
          <View style={styles.col}>
            <TextInput
              style={styles.input}
              value={form.quantity.toString()}
              onChangeText={(v) => onChangeField('quantity', v)}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.col}>
            <TouchableOpacity style={styles.selectInput} onPress={rotateUnit}>
              <Text style={styles.selectText}>{form.unit}</Text>
              <Ionicons name="chevron-down" size={scale(20)} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.label}>Ngày hết hạn</Text>
        <View style={[styles.expiryRow, expiryError && styles.expiryWrapError]}>
          <TextInput
            style={[styles.expiryTextInput, !form.expiryDate && styles.expiryPlaceholder]}
            value={form.expiryDate}
            onChangeText={(v) => onChangeField('expiryDate', v)}
            placeholder="Chọn hoặc nhập ngày hết hạn"
            keyboardType="default"
            maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
          />
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.expiryIconBtn} hitSlop={{top:10,bottom:10,left:10,right:10}}>
            <Ionicons name="calendar-outline" size={scale(24)} color="#64748B" />
          </TouchableOpacity>
        </View>
        {expiryError && <Text style={styles.errorText}>Vui lòng chọn ngày hết hạn</Text>}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>{submitLabel}</Text>
        </TouchableOpacity>

        {mode === 'edit' && (
          <TouchableOpacity style={styles.deleteButton} onPress={() => setDeleteVisible(true)}>
            <Ionicons name="trash" size={scale(20)} color="#EF4444" />
            <Text style={styles.deleteText}>Xóa khỏi kho</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Date picker modal for Android, inline for iOS */}
      {showDatePicker && Platform.OS === 'android' && (
        <Modal
          transparent
          animationType="fade"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={form.expiryDate ? parseDate(form.expiryDate) : new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDatePicker(false)}>
                <Text style={{color:'#F97316',fontWeight:'bold',fontSize:scale(16)}}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      {showDatePicker && Platform.OS === 'ios' && (
        <DateTimePicker
          value={form.expiryDate ? parseDate(form.expiryDate) : new Date()}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
        />
      )}

      <ActionSuccessPopup
        visible={successVisible}
        title={successTitle}
        message={successMessage}
        primaryLabel="Xem kho"
        onPrimaryPress={() => {
          setSuccessVisible(false);
          navigation.goBack();
        }}
        secondaryLabel="Thêm món khác"
        onSecondaryPress={handleContinueAdd}
      />

      <DeleteConfirmModal
        visible={deleteVisible}
        foodName={foodNameForDelete}
        onCancel={() => setDeleteVisible(false)}
        onConfirm={handleDeleteConfirm}
      />
    </SafeAreaView>
  );
};

const createStyles = (scale: (size: number) => number) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { padding: scale(20), paddingTop: 0 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: scale(16),
      paddingHorizontal: scale(20),
      marginBottom: scale(20),
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    cancelText: { fontSize: scale(18), fontWeight: '600', color: '#F97316' },
    headerTitle: { fontSize: scale(24), fontWeight: 'bold', color: '#111827' },
    photoBox: {
      width: scale(100),
      height: scale(100),
      borderRadius: scale(20),
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: scale(12),
      borderWidth: 2,
      borderColor: '#E5E7EB',
      borderStyle: 'dashed',
    },
    changePhoto: {
      textAlign: 'center',
      color: '#F97316',
      fontSize: scale(14),
      marginBottom: scale(24),
      fontWeight: '500',
    },
    label: {
      fontSize: scale(16),
      fontWeight: '600',
      color: '#374151',
      marginTop: scale(12),
      marginBottom: scale(6),
    },
    input: {
      backgroundColor: 'white',
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: '#D1D5DB',
      paddingHorizontal: scale(16),
      paddingVertical: scale(16),
      fontSize: scale(16),
      minHeight: scale(52),
    },
    selectInput: {
      backgroundColor: 'white',
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: '#D1D5DB',
      paddingHorizontal: scale(16),
      paddingVertical: scale(16),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: scale(52),
    },
    selectText: { fontSize: scale(16), color: '#111827' },
    batchTitle: {
      fontSize: scale(28),
      fontWeight: 'bold',
      color: '#111827',
      marginTop: scale(20),
      marginBottom: scale(12),
    },
    rowFields: {
      flexDirection: 'row',
      gap: scale(12),
      marginBottom: scale(8),
    },
    col: {
      flex: 1,
      minWidth: 0,
    },
    expiryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'white',
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: '#D1D5DB',
      paddingHorizontal: scale(8),
      minHeight: scale(52),
    },
    expiryWrapError: {
      borderColor: '#EF4444',
      backgroundColor: '#FEF2F2',
    },
    expiryTextInput: {
      flex: 1,
      fontSize: scale(16),
      color: '#111827',
      backgroundColor: 'transparent',
      borderWidth: 0,
      paddingVertical: scale(16),
      paddingHorizontal: scale(8),
    },
    expiryPlaceholder: { color: '#9CA3AF' },
    expiryIconBtn: {
      padding: scale(8),
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: scale(16),
      padding: scale(20),
      alignItems: 'center',
      minWidth: scale(280),
    },
    modalCloseBtn: {
      marginTop: scale(12),
      paddingVertical: scale(8),
      paddingHorizontal: scale(24),
      borderRadius: scale(8),
      backgroundColor: '#F3F4F6',
    },
    errorText: {
      color: '#EF4444',
      fontSize: scale(14),
      marginTop: scale(6),
      fontWeight: '500',
    },
    submitButton: {
      backgroundColor: '#F97316',
      borderRadius: scale(14),
      paddingVertical: scale(18),
      alignItems: 'center',
      marginTop: scale(24),
      minHeight: scale(56),
    },
    submitText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: scale(18),
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: scale(12),
      marginTop: scale(16),
      borderTopWidth: 1,
      borderTopColor: '#FEE2E2',
      gap: scale(8),
    },
    deleteText: { color: '#DC2626', fontSize: scale(16), fontWeight: '600' },
  });

export { FoodFormScreen };
export default FoodFormScreen;

