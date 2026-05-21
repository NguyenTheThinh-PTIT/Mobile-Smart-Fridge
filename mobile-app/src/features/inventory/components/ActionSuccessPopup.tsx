import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '@/core/theme/responsive';

interface ActionSuccessPopupProps {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  badgeColor?: string;
}

export const ActionSuccessPopup: React.FC<ActionSuccessPopupProps> = ({
  visible,
  title,
  message,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  iconName = 'checkmark',
  iconColor = '#EA8A22',
  badgeColor = '#FDF1E5',
}) => {
  const { scale } = useResponsive();
  const styles = React.useMemo(() => createStyles(scale), [scale]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={[styles.iconWrap, { backgroundColor: badgeColor }]}>
            <Ionicons name={iconName} size={scale(36)} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={onPrimaryPress} activeOpacity={0.9}>
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          </TouchableOpacity>

          {!!secondaryLabel && !!onSecondaryPress && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onSecondaryPress} activeOpacity={0.8}>
              <Text style={styles.secondaryText}>{secondaryLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (scale: (size: number) => number) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: scale(20),
    },
    modalCard: {
      width: '100%',
      maxWidth: scale(360),
      borderRadius: scale(28),
      backgroundColor: '#FFF',
      paddingHorizontal: scale(22),
      paddingTop: scale(28),
      paddingBottom: scale(22),
      alignItems: 'center',
    },
    iconWrap: {
      width: scale(74),
      height: scale(74),
      borderRadius: scale(37),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scale(20),
    },
    title: {
      fontSize: scale(32),
      fontWeight: '900',
      color: '#0F172A',
      textAlign: 'center',
      marginBottom: scale(10),
    },
    message: {
      fontSize: scale(16),
      color: '#64748B',
      textAlign: 'center',
      lineHeight: scale(24),
      marginBottom: scale(24),
    },
    primaryButton: {
      width: '100%',
      minHeight: scale(54),
      borderRadius: scale(14),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#EA8A22',
      marginBottom: scale(14),
    },
    primaryText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: scale(20),
    },
    secondaryButton: {
      minHeight: scale(38),
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryText: {
      color: '#EA8A22',
      fontWeight: '800',
      fontSize: scale(20),
    },
  });
