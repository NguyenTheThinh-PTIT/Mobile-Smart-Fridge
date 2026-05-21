import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from '@/core/base_widgets';
import { useResponsive } from '@/core/theme/responsive';

/**
 * Social Feature - Placeholder screen
 *
 * TODO: Implement social feed
 * TODO: Implement share recipes
 * TODO: Implement user profiles
 * TODO: Implement messaging
 */
export const SocialScreen: React.FC<{
  navigation: any;
}> = ({ navigation }) => {
  const { scale } = useResponsive();

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { fontSize: scale(24) }]}>Social</Text>
      <Text style={styles.subtitle}>Share and discover recipes with friends</Text>

      <View style={styles.content}>
        <Text style={styles.placeholder}>No posts yet</Text>
      </View>

      <Button
        title="Create Post"
        onPress={() => navigation.navigate('CreatePost')}
        style={styles.button}
        size="large"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  content: {
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
  },
  button: {
    marginBottom: 32,
  },
});
