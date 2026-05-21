import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '@/core/theme/responsive';

export const HelpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { scale } = useResponsive();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={scale(20)} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Trợ giúp</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.card}>
        <Text style={styles.question}>Cần hỗ trợ quản lý tài khoản hoặc thành viên?</Text>
        <Text style={styles.answer}>Bạn có thể liên hệ đội ngũ hỗ trợ qua email support@fridge.ai hoặc hotline 1900-0000.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F7F6' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  card: {
    margin: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
  },
  question: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  answer: {
    color: '#64748B',
    lineHeight: 22,
  },
});
