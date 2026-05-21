import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '@/core/theme/responsive';

interface DeleteConfirmModalProps {
  visible: boolean;
  foodName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  foodName,
  onCancel,
  onConfirm,
}) => {
  const { scale } = useResponsive();
  const styles = React.useMemo(() => createStyles(scale), [scale]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="trash-outline" size={scale(32)} color="#EF4444" />
          </View>

          <Text style={styles.title}>Xóa thực phẩm này?</Text>
          <Text style={styles.message}>
            Bạn có chắc chắn muốn xóa <Text style={styles.foodName}>{foodName}</Text>? Hành động này không thể hoàn tác.
          </Text>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionBtn} onPress={onConfirm} activeOpacity={0.85}>
            <Text style={styles.deleteText}>Xóa</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionBtn} onPress={onCancel} activeOpacity={0.85}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (scale: (size: number) => number) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.48)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: scale(20),
    },
    modalCard: {
      width: '100%',
      maxWidth: scale(340),
      borderRadius: scale(24),
      backgroundColor: '#FFF',
      alignItems: 'center',
      paddingTop: scale(24),
      overflow: 'hidden',
    },
    iconWrap: {
      width: scale(74),
      height: scale(74),
      borderRadius: scale(37),
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scale(16),
    },
    title: {
      fontSize: scale(30),
      fontWeight: '900',
      color: '#0F172A',
      textAlign: 'center',
      marginBottom: scale(10),
    },
    message: {
      fontSize: scale(16),
      lineHeight: scale(24),
      color: '#64748B',
      textAlign: 'center',
      paddingHorizontal: scale(20),
      marginBottom: scale(16),
    },
    foodName: {
      color: '#0F172A',
      fontWeight: '900',
    },
    divider: {
      width: '100%',
      height: 1,
      backgroundColor: '#E2E8F0',
    },
    actionBtn: {
      width: '100%',
      minHeight: scale(62),
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteText: {
      color: '#EF4444',
      fontSize: scale(20),
      fontWeight: '800',
    },
    cancelText: {
      color: '#64748B',
      fontSize: scale(20),
      fontWeight: '600',
    },
  });
