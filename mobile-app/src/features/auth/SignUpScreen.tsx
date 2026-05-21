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
import { useAppDispatch } from '@/store/hooks';
import { authActions } from '@/store/authSlice';
import { householdThunks } from '@/store/householdThunks';
import { householdApi } from '@/features/account/api';
import { SafeAreaWrapper } from '@/core/base_widgets/SafeAreaWrapper';
import { useResponsive } from '@/core/theme/responsive';
import { userApi } from './api';
import { axiosClient } from '@/core/network/AxiosClient';

export const SignUpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const { scale, fontScale, isCompact } = useResponsive();
  const textInputMaxFontSizeMultiplier = Math.max(1.2, Math.min(fontScale, 1.8));

  // Password strength logic
  const calculateStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '#E2E8F0' }; // Default gray
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'YẾU', color: '#EF4444' };
    if (score === 2) return { score: 2, label: 'VỪA', color: '#F59E0B' };
    if (score === 3) return { score: 3, label: 'MẠNH', color: '#10B981' };
    return { score: 4, label: 'MẠNH', color: '#10B981' };
  };

  const strength = calculateStrength(password);
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  
  // Validate email format
  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const handleSignUp = async () => {
    if (isSubmitting) {
      return;
    }

    // Validate form
    if (!fullName.trim()) {
      setErrorMessage('Vui lòng nhập họ tên.');
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      setErrorMessage('Vui lòng nhập email hợp lệ.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (!confirmPassword) {
      setErrorMessage('Vui lòng nhập lại mật khẩu.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu nhập lại không khớp.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    setShowSuccessModal(true);

    try {
      const registerData = {
        name: fullName.trim(),
        email: email.trim(),
        password,
      };
      const response = await userApi.register(registerData);

      if (!response?.token) {
        throw new Error('Phản hồi đăng ký không hợp lệ: thiếu token.');
      }

      axiosClient.setAuthToken(response.token);
      dispatch(authActions.loginSuccess(response));
      
      // Fetch household after signup
      dispatch(householdThunks.fetchHousehold());
      setShowSuccessModal(false);
    } catch (error: any) {
      const message = error?.message ?? 'Đăng ký thất bại. Vui lòng thử lại.';
      setErrorMessage(message);
      setShowSuccessModal(false);
      dispatch(authActions.loginFailure(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    setShowSuccessModal(false);
    // Navigate back to Login
    navigation.replace('Login');
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
            {
              paddingHorizontal: scale(24),
              paddingTop: scale(16),
              paddingBottom: scale(24),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Actions */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={scale(24)} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtnOrange} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={scale(20)} color="#F97316" />
            </TouchableOpacity>
          </View>

          {/* Title Area */}
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { fontSize: scale(isCompact ? 24 : 28) }]}>Tạo Bếp Mới</Text>
            <Text style={styles.subtitle}>
              Bắt đầu quản lý thực phẩm thông minh cho{'\n'}gia đình bạn
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Full Name */}
            <Text style={styles.inputLabel}>HỌ VÀ TÊN</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#94A3B8"
                value={fullName}
                onChangeText={setFullName}
                maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
              />
              <Ionicons name="person-outline" size={scale(20)} color="#64748B" />
            </View>

            {/* Email */}
            <Text style={styles.inputLabel}>EMAIL/SỐ ĐIỆN THOẠI</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="nguyenvana@gmail.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
              />
              <Ionicons name="at-outline" size={scale(20)} color="#64748B" />
            </View>



            {/* Password */}
            <Text style={styles.inputLabel}>MẬT KHẨU</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Password123!"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.iconHitbox}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={scale(20)}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
            
            {/* Strength Meter */}
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4].map((index) => (
                  <View
                    key={index}
                    style={[
                      styles.strengthBar,
                      { backgroundColor: strength.score >= index ? strength.color : '#E2E8F0' },
                    ]}
                  />
                ))}
              </View>
              {strength.label ? (
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              ) : null}
            </View>

            {/* Confirm Password */}
            <Text style={styles.inputLabel}>XÁC NHẬN MẬT KHẨU</Text>
            <View style={[styles.inputWrapper, isMismatch && styles.inputWrapperError]}>
              <TextInput
                style={[styles.input, isMismatch && styles.inputErrorText]}
                placeholder="Xác nhận mật khẩu"
                placeholderTextColor={isMismatch ? "#EF4444" : "#94A3B8"}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
              />
              {isMismatch ? (
                <Ionicons name="alert-circle-outline" size={scale(20)} color="#EF4444" />
              ) : (
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.iconHitbox}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={scale(20)}
                    color="#64748B"
                  />
                </TouchableOpacity>
              )}
            </View>
            {isMismatch && (
              <View style={styles.errorTextContainer}>
                <Ionicons name="alert-circle" size={scale(14)} color="#EF4444" />
                <Text style={styles.errorText}>Mật khẩu không khớp!</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!fullName || !email || !password || !confirmPassword || isMismatch || isSubmitting) &&
                  styles.submitButtonDisabled
              ]} 
              onPress={handleSignUp}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>{isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}</Text>
              {!isSubmitting && (
                <Ionicons name="arrow-forward" size={scale(20)} color="#FFF" style={styles.submitBtnIcon} />
              )}
            </TouchableOpacity>
            {!!errorMessage && <Text style={styles.formErrorText}>{errorMessage}</Text>}
          </View>

          {/* Footer Link */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal transparent visible={showSuccessModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Orange Check Icon */}
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={scale(40)} color="#FFF" />
            </View>
            
            <Text style={styles.modalTitle}>Đăng ký thành công</Text>
            
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleGoToLogin}>
              <Text style={styles.modalPrimaryBtnText}>Đăng nhập ngay</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.modalSecondaryBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  // Header Actions
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnOrange: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Title container
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
  },
  // Form elements
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputWrapperError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    marginBottom: 8, // Reduce bottom margin to make room for error text
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#1E293B',
  },
  inputErrorText: {
    color: '#EF4444',
  },
  iconHitbox: {
    padding: 4,
  },
  errorTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginLeft: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginLeft: 4,
  },
  formErrorText: {
    marginTop: 8,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Strength Meter
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: -10, // pull slightly closer to input
    paddingHorizontal: 4,
  },
  strengthBars: {
    flexDirection: 'row',
    flex: 1,
    gap: 6,
    marginRight: 16,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 45,
    textAlign: 'right',
  },
  // Submit Custom
  submitButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#FDBA74',
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitBtnIcon: {
    marginLeft: 8,
  },
  // Footer
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingVertical: 16,
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
  },
  footerLink: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 6,
    borderColor: '#FFF7ED',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 32,
    textAlign: 'center',
  },
  modalPrimaryBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#F97316',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalPrimaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSecondaryBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  }
});
