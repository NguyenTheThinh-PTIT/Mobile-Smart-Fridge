import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';

export interface AppNoticeModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  variant?: 'success' | 'info' | 'warning' | 'error';
  onClose: () => void;
}

const variantStyles: Record<
  NonNullable<AppNoticeModalProps['variant']>,
  {
    iconName: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBackground: string;
    titleColor: string;
    borderColor: string;
    buttonVariant: 'primary' | 'secondary' | 'danger';
  }
> = {
  success: {
    iconName: 'checkmark-circle',
    iconColor: '#16A34A',
    iconBackground: '#DCFCE7',
    titleColor: '#14532D',
    borderColor: '#BBF7D0',
    buttonVariant: 'primary',
  },
  info: {
    iconName: 'information-circle',
    iconColor: '#2563EB',
    iconBackground: '#DBEAFE',
    titleColor: '#1E3A8A',
    borderColor: '#BFDBFE',
    buttonVariant: 'primary',
  },
  warning: {
    iconName: 'warning',
    iconColor: '#D97706',
    iconBackground: '#FEF3C7',
    titleColor: '#92400E',
    borderColor: '#FDE68A',
    buttonVariant: 'secondary',
  },
  error: {
    iconName: 'alert-circle',
    iconColor: '#DC2626',
    iconBackground: '#FEE2E2',
    titleColor: '#991B1B',
    borderColor: '#FECACA',
    buttonVariant: 'danger',
  },
};

export const AppNoticeModal: React.FC<AppNoticeModalProps> = ({
  visible,
  title,
  message,
  buttonText = 'Đóng',
  variant = 'info',
  onClose,
}) => {
  const visual = variantStyles[variant];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.dialog, { borderColor: visual.borderColor }]}> 
          <View style={[styles.iconWrap, { backgroundColor: visual.iconBackground }]}> 
            <Ionicons name={visual.iconName} size={26} color={visual.iconColor} />
          </View>

          <Text style={[styles.title, { color: visual.titleColor }]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Button
            title={buttonText}
            onPress={onClose}
            size="medium"
            variant={visual.buttonVariant}
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 12,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
  },
  button: {
    marginTop: 18,
    width: '100%',
  },
});
