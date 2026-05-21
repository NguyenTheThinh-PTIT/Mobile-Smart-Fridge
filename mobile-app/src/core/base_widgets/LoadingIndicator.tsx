import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { scaleSize } from '@/core/theme/responsive';

const screenWidth = Dimensions.get('window').width;
const s = (size: number) => scaleSize(size, screenWidth);

/**
 * LoadingIndicator - Hiển thị loading spinner
 */
export const LoadingIndicator: React.FC<{
  size?: 'small' | 'large';
  color?: string;
  message?: string;
}> = ({ size = 'large', color = '#007AFF', message }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: s(12),
    color: '#64748B',
    fontSize: s(14),
  },
});
