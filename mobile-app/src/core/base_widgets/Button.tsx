import React from 'react';
import { Dimensions, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { scaleSize } from '@/core/theme/responsive';

const screenWidth = Dimensions.get('window').width;
const s = (size: number) => scaleSize(size, screenWidth);

/**
 * Button - Custom button component
 */
export const Button: React.FC<{
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}> = ({ title, onPress, variant = 'primary', size = 'medium', disabled, style, textStyle }) => {
  const mode = variant === 'secondary' ? 'outlined' : 'contained';
  const buttonColor =
    variant === 'danger'
      ? '#FF3B30'
      : variant === 'primary'
      ? '#FF7622'
      : undefined;

  return (
    <PaperButton
      mode={mode}
      style={[styles.button, styles[`size_${size}`], disabled && styles.disabled, style]}
      buttonColor={buttonColor}
      onPress={onPress}
      disabled={disabled}
      labelStyle={[styles.text, styles[`text_${variant}`], textStyle]}
    >
      {title}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: s(8),
  },
  size_small: {
    minHeight: s(36),
    justifyContent: 'center',
  },
  size_medium: {
    minHeight: s(44),
    justifyContent: 'center',
  },
  size_large: {
    minHeight: s(52),
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: s(16),
    fontWeight: '600',
  },
  text_primary: {
    color: '#fff',
  },
  text_secondary: {
    color: '#1E293B',
  },
  text_danger: {
    color: '#fff',
  },
});
