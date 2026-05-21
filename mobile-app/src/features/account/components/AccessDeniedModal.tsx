import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useResponsive } from '@/core/theme/responsive';

interface AccessDeniedModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({ visible, onClose }) => {
  const { scale } = useResponsive();

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={[styles.title, { fontSize: scale(30) }]}>Truy cập bị từ chối</Text>
          <Text style={styles.message}>
            Trưởng nhà đã đóng quyền truy cập của bạn vào thao tác này trong Bếp.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Quay lại Trang chủ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
  },
  title: {
    color: '#0F172A',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 18,
    lineHeight: 26,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 18,
  },
  button: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EA8A22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
