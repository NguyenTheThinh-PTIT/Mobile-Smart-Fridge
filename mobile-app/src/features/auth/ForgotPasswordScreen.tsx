import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { SafeAreaWrapper } from '@/core/base_widgets/SafeAreaWrapper';
import { FOODI_LOGO_SVG } from '@/core/constants/brandLogo';
import { useResponsive } from '@/core/theme/responsive';
import { userApi } from './api';

export const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { scale, fontScale } = useResponsive();
  const textInputMaxFontSizeMultiplier = Math.max(1.2, Math.min(fontScale, 1.8));

  const handleSendCode = async () => {
    if (loading) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Vui lòng nhập email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await userApi.forgotPassword({ email: normalizedEmail });
      navigation.navigate('OtpVerification', { email: normalizedEmail });
    } catch (err: any) {
      setError(err?.message ?? 'Gửi mã xác thực thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaWrapper style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: scale(20), paddingTop: scale(12), paddingBottom: scale(24) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={scale(24)} color="#0F172A" />
            </TouchableOpacity>
            <View style={styles.logoWrap}>
              <SvgXml xml={FOODI_LOGO_SVG} width={scale(104)} height={scale(50)} />
            </View>
            <View style={styles.spacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroCircle}>
              <Ionicons name="lock-closed-outline" size={scale(34)} color="#FFF" />
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Quên mật khẩu?</Text>
            <Text style={styles.subtitle}>
              Nhập email của bạn để nhận mã xác thực lấy lại mật khẩu.
            </Text>

            <Text style={styles.inputLabel}>Email</Text>
            <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
              <TextInput
                style={styles.input}
                placeholder="user@example.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
              />
                <Ionicons name={error ? 'alert-circle-outline' : 'mail-outline'} size={scale(20)} color={error ? '#EF4444' : '#94A3B8'} />
            </View>
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} onPress={handleSendCode} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>{loading ? 'Đang gửi...' : 'Gửi mã xác thực'}</Text>
              <Ionicons name="chevron-forward" size={scale(18)} color="#FFF" />
            </TouchableOpacity>

            <Text style={styles.supportText}>
              Bạn cần hỗ trợ thêm? <Text style={styles.supportLink}>Liên hệ hỗ trợ</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  logoWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  spacer: { width: 44 },
  heroCard: { marginTop: 18, height: 176, borderRadius: 36, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center', shadowColor: '#F97316', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 18, elevation: 8 },
  heroCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#FB923C', alignItems: 'center', justifyContent: 'center' },
  content: { marginTop: 28 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#64748B', lineHeight: 22, marginBottom: 28 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 56 },
  inputWrapperError: { borderColor: '#EF4444' },
  input: { flex: 1, fontSize: 16, color: '#0F172A' },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 10, marginLeft: 2 },
  primaryButton: { marginTop: 36, height: 56, borderRadius: 28, backgroundColor: '#F97316', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#F97316', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800', marginRight: 8 },
  supportText: { marginTop: 22, textAlign: 'center', color: '#64748B', fontSize: 13 },
  supportLink: { color: '#F97316' },
});
