import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useResponsive } from '@/core/theme/responsive';

interface RemoveMemberConfirmModalProps {
  visible: boolean;
  memberName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RemoveMemberConfirmModal: React.FC<RemoveMemberConfirmModalProps> = ({
  visible,
  memberName,
  onConfirm,
  onCancel,
}) => {
  const { scale } = useResponsive();

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={[styles.title, { fontSize: scale(28) }]}>Xóa khỏi Bếp này?</Text>
          <Text style={styles.message}>
            Bạn có chắc chắn muốn xóa <Text style={styles.bold}>{memberName}</Text> khỏi Bếp này? Hành động này không thể hoàn tác.
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 22,
    backgroundColor: '#FFF',
    padding: 20,
  },
  title: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: '#64748B',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 18,
  },
  bold: {
    color: '#0F172A',
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
