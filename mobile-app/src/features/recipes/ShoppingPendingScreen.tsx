import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '@/core/theme/responsive';

export const ShoppingPendingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { scale } = useResponsive();
  const styles = React.useMemo(() => createStyles(scale), [scale]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.9}>
          <Ionicons name="chevron-back" size={scale(22)} color="#181C2E" />
        </TouchableOpacity>
        <Text style={styles.title}>Mua sắm</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.pendingText}>Pending</Text>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (scale: (size: number) => number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    topBar: {
      marginTop: scale(8),
      paddingHorizontal: scale(24),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: scale(45),
      height: scale(45),
      borderRadius: scale(23),
      backgroundColor: '#ECF0F4',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: scale(17),
      lineHeight: scale(22),
      color: '#181C2E',
      fontWeight: '500',
    },
    placeholder: {
      width: scale(45),
      height: scale(45),
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: scale(24),
    },
    pendingText: {
      fontSize: scale(24),
      color: '#181C2E',
      fontWeight: '700',
    },
  });
