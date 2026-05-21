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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaWrapper } from '@/core/base_widgets/SafeAreaWrapper';
import { useResponsive } from '@/core/theme/responsive';
import { userApi } from './api';

const getStrength = (password: string) => {
  if (!password) return { score: 0, label: '', color: '#E2E8F0' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: 'Yếu', color: '#EF4444' };
  if (score === 2) return { score: 2, label: 'Vừa', color: '#F59E0B' };
  return { score: 4, label: 'Mạnh', color: '#22C55E' };
};

export const ResetPasswordScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const email = route?.params?.email ?? '';
  const otpCode = route?.params?.otpCode ?? '';
  const { scale, fontScale } = useResponsive();
  const textInputMaxFontSizeMultiplier = Math.max(1.2, Math.min(fontScale, 1.8));

  const strength = getStrength(newPassword);
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleUpdatePassword = async () => {
    if (isSubmitting || !newPassword || !confirmPassword || mismatch) return;
    if (!email || !otpCode) {
      setApiError('Thiếu thông tin xác thực. Vui lòng thực hiện lại bước xác minh OTP.');
      return;
    }

    setIsSubmitting(true);
    setApiError('');

    try {
      await userApi.resetPassword({
        email,
        otpCode,
        newPassword,
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      setApiError(err?.message ?? 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoLogin = () => {
    setShowSuccessModal(false);
    navigation.replace('Login');
  };

  return (
    <SafeAreaWrapper style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={scale(24)} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Đặt lại mật khẩu</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Đặt lại mật khẩu</Text>
            <Text style={styles.subtitle}>Vui lòng thiết lập mật khẩu mới cho tài khoản của bạn để đảm bảo an toàn.</Text>

            <Text style={styles.inputLabel}>Mật khẩu mới</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="********"
                placeholderTextColor="#94A3B8"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
              />
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={scale(20)} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.strengthRow}>
              <Text style={styles.strengthLabel}>Độ mạnh mật khẩu</Text>
              <Text style={[styles.strengthValue, { color: strength.color }]}>{strength.label || ' '}</Text>
            </View>
            <View style={styles.strengthBars}>
              {[1, 2, 3, 4].map((index) => (
                <View key={index} style={[styles.strengthBar, { backgroundColor: strength.score >= index ? strength.color : '#E2E8F0' }]} />
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 24 }]}>XÁC NHẬN MẬT KHẨU MỚI</Text>
            <View style={[styles.inputWrapper, mismatch && styles.inputWrapperError]}>
              <TextInput
                style={[styles.input, mismatch && styles.inputErrorText]}
                placeholder="Xác nhận mật khẩu mới"
                placeholderTextColor={mismatch ? '#EF4444' : '#94A3B8'}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
              />
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={scale(20)} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {!!mismatch && <Text style={styles.errorText}>Mật khẩu không khớp!</Text>}

            <TouchableOpacity
              style={[styles.primaryButton, (!newPassword || !confirmPassword || mismatch || isSubmitting) && styles.primaryButtonDisabled]}
              onPress={handleUpdatePassword}
              disabled={!newPassword || !confirmPassword || mismatch || isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>{isSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</Text>
              {!isSubmitting && <Ionicons name="checkmark-circle-outline" size={scale(20)} color="#FFF" />}
            </TouchableOpacity>
            {!!apiError && <Text style={styles.apiErrorText}>{apiError}</Text>}

            <Text style={styles.footerNote}>
              Bằng cách tiếp tục, bạn đồng ý với các Điều khoản bảo mật của chúng tôi.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal transparent visible={showSuccessModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="checkmark" size={scale(40)} color="#FFF" />
            </View>
            <Text style={styles.modalTitle}>Thay đổi thành công!</Text>
            <Text style={styles.modalDesc}>Mật khẩu của bạn đã được cập nhật. Hãy sử dụng mật khẩu mới để đăng nhập.</Text>
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleGoLogin} activeOpacity={0.85}>
              <Text style={styles.modalPrimaryBtnText}>Đăng nhập ngay</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.modalSecondaryText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerSpacer: { width: 44 },
  content: { marginTop: 26 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  subtitle: { color: '#64748B', fontSize: 15, lineHeight: 22, marginBottom: 24 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FFF', height: 56, paddingHorizontal: 16 },
  inputWrapperError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  input: { flex: 1, fontSize: 16, color: '#0F172A' },
  inputErrorText: { color: '#EF4444' },
  iconBtn: { padding: 4 },
  strengthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 6 },
  strengthLabel: { color: '#64748B', fontSize: 12 },
  strengthValue: { fontSize: 12, fontWeight: '800' },
  strengthBars: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  strengthBar: { flex: 1, height: 5, borderRadius: 999 },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 10, marginLeft: 4 },
  primaryButton: { marginTop: 34, height: 56, borderRadius: 28, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, shadowColor: '#F97316', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  footerNote: { textAlign: 'center', color: '#94A3B8', fontSize: 13, lineHeight: 20, marginTop: 18 },
  apiErrorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 28, padding: 30, alignItems: 'center' },
  modalIconCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#F97316', borderWidth: 8, borderColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 10, textAlign: 'center' },
  modalDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 26 },
  modalPrimaryBtn: { width: '100%', height: 52, borderRadius: 26, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalPrimaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  modalSecondaryText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
});
