import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '@/core/theme/responsive';
import { userApi } from '@/features/auth/api';

export const ProfileSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { scale, fontScale } = useResponsive();
  const textInputMaxFontSizeMultiplier = Math.max(1.2, Math.min(fontScale, 1.8));

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await userApi.getProfile();
        const user = res?.user || res;
        if (mounted) {
          setName(user?.name || '');
          setEmail(user?.email || '');
          setPhone(user?.phone || '');
        }
      } catch (err) {
        // Có thể show thông báo lỗi
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await userApi.updateProfile({ name }); // Nếu backend hỗ trợ thêm email/phone thì truyền thêm
      Alert.alert('Thành công', 'Đã lưu thay đổi thông tin tài khoản!');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lưu thay đổi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={scale(20)} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Cài đặt tài khoản</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 32 }} />
        ) : (
          <>
            <Text style={styles.label}>Họ tên</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} maxFontSizeMultiplier={textInputMaxFontSizeMultiplier} />

            <Text style={styles.label}>Email</Text>
            <TextInput
  style={styles.input}
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
/>
            {/* <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
  style={styles.input}
  value={phone}
  onChangeText={setPhone}
  keyboardType="phone-pad"
  maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
/> */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveText}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Text>
            </TouchableOpacity>
          </>
        )}
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
  content: { padding: 16 },
  label: { fontSize: 14, color: '#64748B', marginBottom: 6, marginTop: 12 },
  input: {
    height: 52,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    color: '#0F172A',
    fontSize: 16,
  },
  saveBtn: {
    marginTop: 22,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#EA8A22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
});
