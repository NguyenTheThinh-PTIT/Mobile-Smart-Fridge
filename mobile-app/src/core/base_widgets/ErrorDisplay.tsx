import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, Button } from 'react-native-paper';

/**
 * ErrorDisplay - Hiển thị error message
 */
export const ErrorDisplay: React.FC<{
  title: string;
  message: string;
  onRetry?: () => void;
}> = ({ title, message, onRetry }) => {
  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <Text variant="titleMedium" style={styles.title}>
          {title}
        </Text>
        <Text variant="bodyMedium" style={styles.message}>
          {message}
        </Text>
        {onRetry ? (
          <Button mode="contained" onPress={onRetry}>
            Thử lại
          </Button>
        ) : null}
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
  },
  surface: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
});
