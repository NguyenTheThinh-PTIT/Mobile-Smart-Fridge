import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput as PaperTextInput, Button as PaperButton } from 'react-native-paper';
import { SvgXml } from 'react-native-svg';
import { useAppDispatch } from '@/store/hooks';
import { authActions } from '@/store/authSlice';
import { SafeAreaWrapper } from '@/core/base_widgets/SafeAreaWrapper';
import { userApi, LoginResponse } from './api';
import { axiosClient } from '@/core/network/AxiosClient';
import { useResponsive } from '@/core/theme/responsive';
import { householdThunks } from '@/store/householdThunks';
import { householdApi } from '@/features/account/api';
import { FOODI_LOGO_SVG } from '@/core/constants/brandLogo';

export const LoginScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const fromQrJoin = route?.params?.fromQrJoin as boolean | undefined;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { scale, fontScale, isCompact } = useResponsive();
  const textInputMaxFontSizeMultiplier = Math.max(1.2, Math.min(fontScale, 1.8));

  const showLoginError = (message: string) => {
    setErrorMessage(message);
    setErrorModalMessage(message);
    setShowErrorModal(true);
    dispatch(authActions.loginFailure(message));
  };

const finalizeLoginSuccess = async (response: LoginResponse, failurePrefix: string) => {
  if (!response?.token) {
    throw new Error('Phản hồi đăng nhập không hợp lệ: thiếu token.');
  }

  axiosClient.setAuthToken(response.token);
  dispatch(authActions.loginSuccess(response));
  
  // Guest household sharing: fetch household after login
  dispatch(householdThunks.fetchHousehold());
  // If inviteCode, ensure join

  
  return true;
};

  // Validate email format
  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const handleLogin = async () => {
    if (isSubmitting) {
      return;
    }

  // Simplified: No invite code required

    // Validate form
    if (!email.trim() || !isValidEmail(email)) {
      showLoginError('Vui lòng nhập email hợp lệ.');
      return;
    }
    if (!password) {
      showLoginError('Vui lòng nhập mật khẩu.');
      return;
    }

    setErrorMessage(null);
    setShowErrorModal(false);
    setIsSubmitting(true);

    try {
      const loginData = { 
        email, 
        password
      };
      const response = await userApi.login(loginData);
      await finalizeLoginSuccess(response, 'Đang đăng nhập');
    } catch (error: any) {
      const message = error?.message ?? 'Đăng nhập thất bại. Vui lòng thử lại.';
      showLoginError(message);
    } finally {
      setIsSubmitting(false);
    }

    // QR Join flow - navigate to HouseholdManagement after login
    if (fromQrJoin) {
      navigation.replace('Account', { 
        screen: 'HouseholdManagementScreen', 
        params: { refreshHousehold: true, fromJoin: true } 
      });
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
            {
              paddingHorizontal: scale(24),
              paddingTop: scale(isCompact ? 28 : 40),
              paddingBottom: scale(24),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <SvgXml xml={FOODI_LOGO_SVG} width={scale(122)} height={scale(59)} />
            </View>
            <Text style={[styles.title, { fontSize: scale(24), lineHeight: scale(34) }]}>Chào mừng trở lại{"\n"}bếp nhà bạn!</Text>
          </View>

          {/* QR Invite Code Display if from QR */}
          {/* QR Scan Button - Primary entry */}
          <TouchableOpacity
            style={styles.qrButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('JoinHousehold')}
          >
            <Ionicons name="qr-code-outline" size={scale(20)} color="#F97316" style={styles.qrIcon} />
            <Text style={styles.qrButtonText}>Quét mã QR để tham gia Bếp</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>HOẶC ĐĂNG NHẬP BẰNG EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>EMAIL / SỐ ĐIỆN THOẠI</Text>
            <PaperTextInput
              mode="outlined"
              style={styles.paperInput}
              outlineStyle={styles.paperInputOutline}
              placeholder="example@gmail.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
            />



            <Text style={styles.inputLabel}>MẬT KHẨU</Text>
            <PaperTextInput
              mode="outlined"
              style={styles.paperInput}
              outlineStyle={styles.paperInputOutline}
              placeholder="••••••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
              right={
                <PaperTextInput.Icon
                  icon={showPassword ? 'eye' : 'eye-off'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <PaperButton
              mode="contained"
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </PaperButton>

            {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
          </View>

          {/* Sign Up */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.footerLink}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal transparent visible={showErrorModal} animationType="fade" onRequestClose={() => setShowErrorModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.circleContainer}>
              <View style={styles.errorCircle}>
                <Ionicons name="close" size={scale(32)} color="#F    FF" />
              </View>
            </View>

            <Text style={styles.modalTitle}>Đăng nhập thất bại</Text>
            <Text style={styles.modalMessage}>{errorModalMessage}</Text>

            <PaperButton mode="contained" style={styles.modalButton} onPress={() => setShowErrorModal(false)}>
              Đóng
            </PaperButton>
          </View>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: 'center',
  },
  qrInviteDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  qrInviteText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  qrCode: {
    fontWeight: 'bold',
    color: '#059669',
  },
  qrHint: {
    color: '#10B981',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 34,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#F97316',
    borderRadius: 12,
    marginBottom: 32,
    backgroundColor: '#FFF',
  },
  qrIcon: {
    marginRight: 8,
  },
  qrButtonText: {
    color: '#F97316',
    fontSize: 16,
    fontWeight: 'bold',
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#1E293B',
  },
  eyeIcon: {
    padding: 4,
  },
  paperInput: {
    marginBottom: 20,
    backgroundColor: '#FFF',
  },
  paperInputOutline: {
    borderRadius: 12,
    borderColor: '#E2E8F0',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 12,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 32,
  },
  loginButtonContent: {
    height: 54,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  socialContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  socialText: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnDisabled: {
    opacity: 0.6,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // Modal classes
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  circleContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  errorCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: '#FEE2E2',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22C55E', // success green
    borderWidth: 2,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 32,
    textAlign: 'center',
  },
  modalMessage: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    borderRadius: 12,
    minWidth: 140,
  },
  errorText: {
    marginTop: 8,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  }
});

