import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { inventoryApi, InvoiceScanItem, InvoiceConfirmItem } from './api';
import { useInventory } from './InventoryContext';
import { useResponsive } from '@/core/theme/responsive';

type InvoicePreviewRouteProp = RouteProp<{ InvoicePreview: { imageUri: string } }, 'InvoicePreview'>;

export const InvoicePreviewScreen: React.FC = () => {
  const route = useRoute<InvoicePreviewRouteProp>();
  const navigation = useNavigation();
  const { imageUri } = route.params;
  const { addFood } = useInventory();
  const { scale, fontScale } = useResponsive();
  const textInputMaxFontSizeMultiplier = Math.max(1.2, Math.min(fontScale, 1.8));

  const [scannedItems, setScannedItems] = useState<InvoiceScanItem[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [scanError, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<InvoiceConfirmItem>({
    name: '',
    quantity: 0,
    unit: 'kg',
    expiryDate: '',
    category: 'Khác',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    scanInvoiceImage();
  }, []);

  const scanInvoiceImage = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const items = await inventoryApi.scanInvoice(imageUri);
      setScannedItems(items);
    } catch (error) {
      console.warn('[InvoicePreviewScreen] Scan failed:', error);
      setError('Không thể quét hóa đơn. Vui lòng thử lại.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleEditItem = (index: number) => {
    const item = scannedItems[index];
    setEditingIndex(index);
    setEditForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.estimatedExpiryDays
        ? formatDateFromDays(item.estimatedExpiryDays)
        : '',
      category: 'Khác',
    });
  };

  const formatDateFromDays = (days: number | undefined): string => {
    if (!days) return '';
    const date = new Date();
    date.setDate(date.getDate() + days);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSaveEdit = () => {
    if (!editForm.name.trim()) {
      Alert.alert('Lỗi', 'Tên thực phẩm không được để trống');
      return;
    }
    if (editForm.quantity <= 0) {
      Alert.alert('Lỗi', 'Số lượng phải lớn hơn 0');
      return;
    }

    const updatedItems = [...scannedItems];
    updatedItems[editingIndex!] = {
      name: editForm.name,
      quantity: editForm.quantity,
      unit: editForm.unit,
      estimatedExpiryDays: parseExpiryDateToDays(editForm.expiryDate),
    };
    setScannedItems(updatedItems);
    setEditingIndex(null);
  };

  const parseExpiryDateToDays = (dateStr: string | undefined): number | undefined => {
    if (!dateStr || !dateStr.trim()) return undefined;
    try {
      const [day, month, year] = dateStr.split('/').map(Number);
      if (!day || !month || !year) return undefined;
      const expiryDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiryDate.setHours(0, 0, 0, 0);
      const diffTime = expiryDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return undefined;
    }
  };

  const handleDeleteItem = (index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmAndSave = async () => {
    if (scannedItems.length === 0) {
      Alert.alert('Lỗi', 'Không có sản phẩm để lưu');
      return;
    }

    setIsSaving(true);
    try {
      // Convert scanned items to confirm items
      const confirmItems: InvoiceConfirmItem[] = scannedItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.estimatedExpiryDays
          ? formatDateFromDays(item.estimatedExpiryDays)
          : '',
        category: 'Khác',
      }));

      // Send to backend
      await inventoryApi.confirmInvoiceItems(confirmItems);

      // Also add to local context
      confirmItems.forEach((item) => {
        addFood({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          expiryDate: item.expiryDate,
          category: item.category,
        });
      });

      Alert.alert('Thành công', 'Sản phẩm đã được lưu vào kho thực phẩm', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.warn('[InvoicePreviewScreen] Save failed:', error);
      Alert.alert('Lỗi', 'Không thể lưu sản phẩm. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={scale(24)} color="#0F172A" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scale(18) }]}>Xác nhận sản phẩm</Text>
        <View style={{ width: 40 }} />
      </View>

      {isScanning ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={[styles.loadingText, { fontSize: scale(16), marginTop: scale(16) }]}>
            Đang quét hóa đơn...
          </Text>
        </View>
      ) : scanError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={scale(48)} color="#EF4444" />
          <Text style={[styles.errorText, { fontSize: scale(16), marginTop: scale(16) }]}>
            {scanError}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { marginTop: scale(20) }]}
            onPress={scanInvoiceImage}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={scale(18)} color="#FFF" />
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Invoice Image Preview */}
            <View style={[styles.imageContainer, { borderRadius: scale(12) }]}>
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: scale(200), borderRadius: scale(12) }}
                resizeMode="cover"
              />
            </View>

            {/* Scanned Items List */}
            <View style={styles.itemsSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { fontSize: scale(16) }]}>
                  Sản phẩm quét được ({scannedItems.length})
                </Text>
              </View>

              {scannedItems.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="receipt-outline" size={scale(48)} color="#CBD5E1" />
                  <Text style={[styles.emptyText, { fontSize: scale(16), marginTop: scale(12) }]}>
                    Không tìm thấy sản phẩm
                  </Text>
                </View>
              ) : (
                scannedItems.map((item, index) => (
                  <View key={index} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { fontSize: scale(16) }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.itemSubtext, { fontSize: scale(13), marginTop: scale(4) }]}>
                          {item.quantity} {item.unit} {item.estimatedExpiryDays ? `• ${item.estimatedExpiryDays} ngày` : ''}
                        </Text>
                      </View>
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleEditItem(index)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="pencil" size={scale(18)} color="#F97316" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { marginLeft: scale(8) }]}
                          onPress={() => handleDeleteItem(index)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={scale(18)} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerBtn, styles.cancelBtn]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
              disabled={isSaving}
            >
              <Text style={[styles.cancelBtnText, { fontSize: scale(16) }]}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footerBtn,
                styles.confirmBtn,
                { opacity: isSaving ? 0.6 : 1 },
              ]}
              onPress={handleConfirmAndSave}
              activeOpacity={0.8}
              disabled={isSaving || scannedItems.length === 0}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={scale(20)} color="#FFF" />
                  <Text style={[styles.confirmBtnText, { fontSize: scale(16), marginLeft: scale(8) }]}>
                    Lưu sản phẩm
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Edit Modal */}
      <Modal transparent visible={editingIndex !== null} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBackBtn}
              onPress={() => setEditingIndex(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={scale(24)} color="#0F172A" />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { fontSize: scale(18) }]}>Chỉnh sửa sản phẩm</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { fontSize: scale(14) }]}>Tên sản phẩm</Text>
              <TextInput
                style={[styles.formInput, { fontSize: scale(16) }]}
                placeholder="Nhập tên sản phẩm"
                placeholderTextColor="#94A3B8"
                value={editForm.name}
                onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: scale(12) }]}>
                <Text style={[styles.formLabel, { fontSize: scale(14) }]}>Số lượng</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scale(16) }]}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  value={String(editForm.quantity)}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, quantity: parseFloat(text) || 0 })
                  }
                  keyboardType="decimal-pad"
                  maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
                />
              </View>
              <View style={[styles.formGroup, { flex: 0.8 }]}>
                <Text style={[styles.formLabel, { fontSize: scale(14) }]}>Đơn vị</Text>
                <TextInput
                  style={[styles.formInput, { fontSize: scale(16) }]}
                  placeholder="kg"
                  placeholderTextColor="#94A3B8"
                  value={editForm.unit}
                  onChangeText={(text) => setEditForm({ ...editForm, unit: text })}
                  maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { fontSize: scale(14) }]}>Hạn sử dụng (dd/mm/yyyy)</Text>
              <TextInput
                style={[styles.formInput, { fontSize: scale(16) }]}
                placeholder="dd/mm/yyyy"
                placeholderTextColor="#94A3B8"
                value={editForm.expiryDate}
                onChangeText={(text) => setEditForm({ ...editForm, expiryDate: text })}
                maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { fontSize: scale(14) }]}>Danh mục</Text>
              <TextInput
                style={[styles.formInput, { fontSize: scale(16) }]}
                placeholder="Khác"
                placeholderTextColor="#94A3B8"
                value={editForm.category}
                onChangeText={(text) => setEditForm({ ...editForm, category: text })}
                maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.footerBtn, styles.cancelBtn]}
              onPress={() => setEditingIndex(null)}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelBtnText, { fontSize: scale(16) }]}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, styles.confirmBtn]}
              onPress={handleSaveEdit}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={scale(20)} color="#FFF" />
              <Text style={[styles.confirmBtnText, { fontSize: scale(16), marginLeft: scale(8) }]}>
                Lưu
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    marginLeft: 8,
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  imageContainer: {
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  itemsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSubtext: {
    fontSize: 13,
    color: '#64748B',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3F2',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 16,
  },
  confirmBtn: {
    backgroundColor: '#F97316',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    color: '#0F172A',
    fontSize: 16,
  },
  formRow: {
    flexDirection: 'row',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
});
