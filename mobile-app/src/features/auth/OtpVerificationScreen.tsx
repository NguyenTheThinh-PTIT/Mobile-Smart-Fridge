import React, { useEffect, useMemo, useRef, useState } from 'react';
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

export const OtpVerificationScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const email = route?.params?.email ?? 'user@example.com';
  const otpInputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(59);
  const [tooManyRequests, setTooManyRequests] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { scale, fontScale } = useResponsive();
  const textInputMaxFontSizeMultiplier = Math.max(1.2, Math.min(fontScale, 1.8));

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isLocked = useMemo(() => attemptsLeft <= 0 || tooManyRequests, [attemptsLeft, tooManyRequests]);

  const handleVerify = async () => {
    if (isLocked || isVerifying || code.length !== 6) return;

    setIsVerifying(true);
    setError('');

    try {
      const response = await userApi.verifyOtp({ email, otpCode: code });

      if (!response?.valid) {
        const nextAttempts = attemptsLeft - 1;
        setAttemptsLeft(nextAttempts);
        setError(`Mã xác thực không đúng. Bạn còn ${Math.max(nextAttempts, 0)} lần thử.`);
        setCode('');
        if (nextAttempts <= 0) {
          setTooManyRequests(true);
          setError('Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 15 phút.');
        }
        return;
      }

      setShowSuccessModal(true);
    } catch (err: any) {
      const nextAttempts = attemptsLeft - 1;
      setAttemptsLeft(nextAttempts);
      setCode('');
      setError(err?.message ?? `Xác thực thất bại. Bạn còn ${Math.max(nextAttempts, 0)} lần thử.`);
      if (nextAttempts <= 0) {
        setTooManyRequests(true);
        setError('Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 15 phút.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || isLocked || isResending) return;

    setIsResending(true);
    setError('');

    try {
      await userApi.forgotPassword({ email });
      setSecondsLeft(59);
      setAttemptsLeft(3);
      setTooManyRequests(false);
      setCode('');
    } catch (err: any) {
      setError(err?.message ?? 'Gửi lại mã thất bại. Vui lòng thử lại.');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoResetPassword = () => {
    setShowSuccessModal(false);
    navigation.navigate('ResetPassword', { email, otpCode: code });
  };

  return (
    <SafeAreaWrapper style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {tooManyRequests && (
            <View style={styles.rateLimitBanner}>
              <Ionicons name="alert-circle-outline" size={scale(20)} color="#B91C1C" />
              <Text style={styles.rateLimitText}>Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 15 phút.</Text>
            </View>
          )}

          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={scale(24)} color="#0F172A" />
            </TouchableOpacity>
            <View style={styles.titleWrap}>
              <Text style={styles.headerTitle}>Xác thực</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Nhập mã Xác thực</Text>
            <Text style={styles.subtitle}>Vui lòng nhập mã 6 số đã được gửi tới số điện thoại của bạn.</Text>

            <TouchableOpacity activeOpacity={1} onPress={() => otpInputRef.current?.focus()}>
              <View style={styles.otpContainer}>
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <View key={idx} style={[styles.otpBox, error ? styles.otpBoxError : null]}>
                    <Text style={styles.otpDigit}>{code[idx] ?? ''}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            <TextInput
              ref={otpInputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={(text: string) => {
                const next = text.replace(/[^0-9]/g, '').slice(0, 6);
                setCode(next);
                if (error) setError('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
              autoFocus
              caretHidden
              contextMenuHidden
            />

            {!!error && (
              <View style={styles.errorBanner}>
                <Ionicons name="warning-outline" size={scale(16)} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, (isLocked || isVerifying || code.length !== 6) && styles.primaryButtonDisabled]}
              onPress={handleVerify}
              disabled={isLocked || isVerifying || code.length !== 6}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>{isVerifying ? 'Đang xác thực...' : 'Xác nhận mã'}</Text>
            </TouchableOpacity>

            <Text style={styles.resendText}>
              Gửi lại mã sau <Text style={styles.resendAccent}>{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}</Text>
            </Text>
            <TouchableOpacity onPress={handleResend} disabled={secondsLeft > 0 || isLocked || isResending}>
              <Text style={[styles.resendLink, (secondsLeft > 0 || isLocked || isResending) && styles.resendLinkDisabled]}>
                {isResending ? 'Đang gửi lại...' : 'Gửi lại mã qua SMS'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal transparent visible={showSuccessModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={scale(38)} color="#FFF" />
            </View>
            <Text style={styles.modalTitle}>Xác minh thành công!</Text>
            <Text style={styles.modalDesc}>
              Mã xác thực của bạn đã hợp lệ. Vui lòng thiết lập mật khẩu mới.
            </Text>
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleGoResetPassword} activeOpacity={0.85}>
              <Text style={styles.modalPrimaryBtnText}>Đặt lại mật khẩu</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.modalSecondaryText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F7F5' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  rateLimitBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 28 },
  rateLimitText: { flex: 1, color: '#991B1B', fontSize: 13, marginLeft: 8, lineHeight: 19 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerSpacer: { width: 44 },
  content: { marginTop: 28 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  subtitle: { color: '#64748B', fontSize: 15, lineHeight: 22, marginBottom: 28 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  otpBox: { width: 48, height: 58, borderRadius: 24, borderWidth: 1.5, borderColor: '#F97316', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  otpBoxError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  otpDigit: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 24 },
  errorText: { color: '#EF4444', fontSize: 13, marginLeft: 8, lineHeight: 18, flex: 1 },
  primaryButton: { height: 56, borderRadius: 28, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center', shadowColor: '#F97316', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  resendText: { textAlign: 'center', color: '#64748B', fontSize: 13, marginTop: 18 },
  resendAccent: { color: '#F97316', fontWeight: '700' },
  resendLink: { textAlign: 'center', color: '#94A3B8', fontSize: 13, marginTop: 12, fontWeight: '600' },
  resendLinkDisabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalContent: { width: '100%', backgroundColor: '#FFF', borderRadius: 28, padding: 30, alignItems: 'center' },
  successCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginBottom: 22, borderWidth: 8, borderColor: '#DCFCE7' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 10, textAlign: 'center' },
  modalDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 26 },
  modalPrimaryBtn: { width: '100%', height: 52, borderRadius: 26, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalPrimaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  modalSecondaryText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
});
