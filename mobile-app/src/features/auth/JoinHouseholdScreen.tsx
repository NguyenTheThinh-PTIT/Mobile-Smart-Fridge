import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppDispatch } from '@/store/hooks';
import { authActions } from '@/store/authSlice';
import { userApi } from './api';
import { axiosClient } from '@/core/network/AxiosClient';
import { householdThunks } from '@/store/householdThunks';
import type { LoginResponse } from './api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useResponsive } from '@/core/theme/responsive';

export const JoinHouseholdScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const manualCodeInputRef = useRef<TextInput>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState(false);

  // States: error / manual input / success
  const [showError, setShowError] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Mã QR đã hết hạn hoặc không hợp lệ!');
  const [inviteCode, setInviteCode] = useState('');
  const [hasScanned, setHasScanned] = useState(false);
  
  // OTP state
  const [manualCode, setManualCode] = useState('');
  const codeLength = 6;
  const { scale, fontScale } = useResponsive();
  const textInputMaxFontSizeMultiplier = Math.max(1.2, Math.min(fontScale, 1.8));

  // Animation vạch quét
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    // Start scan animation from 0% height to 100% height repeatedly
    scanLineY.value = withRepeat(
      withSequence(
        withTiming(250, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (!permission) {
      return;
    }

    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const animatedLineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: scanLineY.value }],
    };
  });

  const normalizeInviteCode = (rawCode: string): string | null => {
    if (!rawCode) {
      return null;
    }

    const trimmed = rawCode.trim();
    if (!trimmed) {
      return null;
    }

    let candidate = trimmed;
    const inviteIndex = candidate.toLowerCase().indexOf('/invite/');
    if (inviteIndex >= 0) {
      candidate = candidate.substring(inviteIndex + '/invite/'.length);
    }

    candidate = candidate.split(/[?#]/)[0]?.trim() ?? candidate;
    const digits = candidate.replace(/\D/g, '');

    if (digits.length === 6) {
      return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    }

    if (/^\d{3}\s\d{3}$/.test(candidate)) {
      return candidate;
    }

    return null;
  };

  const triggerError = (message: string) => {
    setErrorMessage(message);
    setShowError(true);
    setTimeout(() => setShowError(false), 3000);
  };

  const triggerSuccess = (code: string) => {
    setInviteCode(code);
    setManualCode(code.replace(/\D/g, ''));
    setShowSuccess(true);
    setShowManualInput(false);
    setHasScanned(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (hasScanned || showSuccess) {
      return;
    }

    const code = normalizeInviteCode(data);
    if (!code) {
      triggerError('Không đọc được mã mời hợp lệ từ QR.');
      return;
    }

    triggerSuccess(code);
  };

  const submitInviteCode = (rawCode: string) => {
    const code = normalizeInviteCode(rawCode);
    if (!code) {
      triggerError('Mã tham gia không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    triggerSuccess(code);
  };

  const handleJoinWithQR = async () => {
    if (isJoining || !inviteCode) return;
    
    setIsJoining(true);
    setErrorMessage('');
    try {
      const code = inviteCode.replace(/\D/g, '');
      const response = await userApi.joinWithQR(code);
      
      // Set token and dispatch login
      axiosClient.setAuthToken(response.token);
      dispatch(authActions.loginSuccess(response));
      dispatch(householdThunks.fetchHousehold());
      
      // Reset nav to Account/HouseholdManagement
      navigation.reset({
        index: 0,
        routes: [{ 
          name: 'Account', 
          params: { 
            screen: 'HouseholdManagementScreen', 
            params: { refreshHousehold: true, fromJoin: true } 
          } 
        }]
      });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Tham gia thất bại. Thử lại.');
      setShowError(true);
    } finally {
      setIsJoining(false);
    }
  };

  const handleEnterHousehold = () => {
    setShowSuccess(false);
    handleJoinWithQR();
  };

  // Nếu chưa load quyền
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  // Nếu bị từ chối
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, styles.bgDark]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={scale(24)} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quét mã QR Gia đình</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.deniedContainer}>
          <View style={styles.deniedIconWrapper}>
            <Ionicons name="camera-reverse-outline" size={scale(60)} color="#64748B" />
            <View style={styles.deniedBadge}>
              <Ionicons name="close-circle" size={scale(20)} color="#EF4444" />
            </View>
          </View>
          <Text style={styles.deniedTitle}>Quyền Camera bị từ chối</Text>
          <Text style={styles.deniedText}>
            Vui lòng cấp quyền Camera trong Cài đặt{'\n'}để tiếp tục
          </Text>

          {permission.canAskAgain ? (
            <TouchableOpacity style={styles.openSettingsBtn} onPress={() => requestPermission()}>
              <Text style={styles.openSettingsText}>Cho phép Camera</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.openSettingsBtn} onPress={() => Linking.openSettings()}>
              <Text style={styles.openSettingsText}>Mở Cài đặt</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom toolbar - Disabled */}
        <View style={styles.bottomToolbar}>
          <TouchableOpacity style={styles.toolBtn} disabled>
            <Ionicons name="image-outline" size={scale(24)} color="#64748B" />
            <Text style={styles.toolBtnTextDisabled}>THƯ VIỆN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} disabled>
            <Ionicons name="flashlight-outline" size={scale(24)} color="#64748B" />
            <Text style={styles.toolBtnTextDisabled}>ĐÈN PIN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, styles.bgDark]}>
      {/* Toast Báo lỗi */}
      {showError && (
        <View style={styles.errorToast}>
          <Ionicons name="alert-circle-outline" size={scale(20)} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.errorToastText}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => setShowError(false)} style={{ marginLeft: 'auto' }}>
            <Ionicons name="close" size={scale(20)} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.closeBtnOverlay}>
          <TouchableOpacity style={styles.closeBtnInner} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={scale(20)} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Quét mã QR Gia đình</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Camera Area */}
      <View style={styles.cameraWrapper}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={showSuccess || hasScanned ? undefined : handleBarcodeScanned}
          enableTorch={flash}
        />
        {/* Overlay Dark */}
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddleRow}>
          <View style={styles.overlaySide} />
          {/* Scanner Framing Box */}
          <View style={styles.scannerBox}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
            {/* Animating Line */}
            <Animated.View style={[styles.scannerLine, animatedLineStyle]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          <Text style={styles.instructionText}>
            Di chuyển camera đến mã QR trên{'\n'}máy của Trưởng nhà
          </Text>
          
          <View style={styles.cameraTools}>
            <TouchableOpacity 
              style={styles.circleBtn} 
              onPress={() => setFlash(!flash)}
            >
              <Ionicons name={flash ? "flashlight" : "flashlight-outline"} size={scale(22)} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleBtn}>
              <Ionicons name="image-outline" size={scale(22)} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          {/* Manual Enter Button Fixed at bottom of scanning area */}
          <TouchableOpacity 
            style={styles.manualEntryBtnOutline}
            onPress={() => setShowManualInput(true)}
          >
            <Text style={styles.manualEntryBtnOutlineText}>Nhập mã thủ công</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Manual Input Modal */}
      <Modal visible={showManualInput} transparent animationType="slide">
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.modalDismissArea} onPress={() => setShowManualInput(false)} />
          <View style={styles.bottomSheetDark}>
            {/* Header / Icon */}
            <View style={styles.sheetHeader}>
              <View style={styles.codeIconBubble}>
                <MaterialCommunityIcons name="numeric" size={28} color="#F97316" />
              </View>
            </View>
            
            <Text style={styles.sheetTitle}>Nhập mã tham gia</Text>
            <Text style={styles.sheetSubtitle}>
              Vui lòng nhập mã gồm 6 chữ số được{'\n'}cung cấp để tiếp tục.
            </Text>
            
            {/* Input Code Display */}
            <TouchableOpacity activeOpacity={1} onPress={() => manualCodeInputRef.current?.focus()}>
              <View style={styles.otpContainer}>
                 {[...Array(codeLength)].map((_, i) => (
                   <View key={i} style={[styles.otpBox, manualCode.length === i && styles.otpBoxActive]}>
                     <Text style={styles.otpDot}>{manualCode[i] ? '•' : ''}</Text>
                   </View>
                 ))}
              </View>
            </TouchableOpacity>
            
            {/* Hidden Input field overlaying */}
            <TextInput
              ref={manualCodeInputRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={6}
              value={manualCode}
              onChangeText={(text) => setManualCode(text.replace(/[^0-9]/g, '').slice(0, codeLength))}
              maxFontSizeMultiplier={textInputMaxFontSizeMultiplier}
              autoFocus
              caretHidden
              contextMenuHidden
            />
            
            {/* Actions */}
            <TouchableOpacity 
              style={[styles.sheetPrimaryBtn, manualCode.length < 6 && { opacity: 0.5 }]}
              disabled={manualCode.length < 6 || isJoining}
              onPress={() => {
                const code = manualCode;
                setInviteCode(`${code.slice(0,3)} ${code.slice(3)}`);
                submitInviteCode(manualCode);
              }}
            >
              <Text style={styles.sheetPrimaryBtnText}>
                {isJoining ? 'Đang tham gia...' : 'Tham gia'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setShowManualInput(false)}>
              <Text style={styles.sheetCancelBtnText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="slide">
        <View style={[styles.modalBg, { backgroundColor: 'rgba(15,23,42,0.8)' }]}>
          <View style={styles.bottomSheetWhite}>
            <View style={styles.dragPill} />
            
            <View style={styles.logoLightRow}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={scale(24)} color="#F97316" />
              <Text style={styles.logoLightText}>SMART FOOD</Text>
            </View>
            
            <View style={styles.successCheckCircle}>
              <Ionicons name="checkmark-circle" size={scale(80)} color="#10B981" />
            </View>
            
            <Text style={styles.successTitleText}>Tham gia thành công</Text>
            <Text style={styles.successSubText}>
              Chào mừng bạn đã tham gia vào{'\n'}
              <Text style={{ fontWeight: 'bold', color: '#1E293B' }}>Mã mời {inviteCode}</Text>
            </Text>
            
            <TouchableOpacity style={styles.intoKitchenBtn} onPress={handleEnterHousehold}>
              <Text style={styles.intoKitchenBtnText}>Vào Bếp ngay</Text>
              <Ionicons name="chevron-forward" size={scale(18)} color="#FFF" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const BORDER_WIDTH = 30; // scanner border
const CORNER_COLOR = '#F97316';
const OVERLAY_COLOR = 'rgba(15, 23, 42, 0.85)'; // Dark overlay #0F172A

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  bgDark: { backgroundColor: '#0F172A' },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    zIndex: 10,
  },
  closeBtnOverlay: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center'
  },
  closeBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnInner: {},
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  
  // Camera & Overlay layout
  cameraWrapper: { flex: 1, width: '100%' },
  overlayTop: { flex: 1, backgroundColor: OVERLAY_COLOR },
  overlayMiddleRow: { flexDirection: 'row', height: 260 },
  overlaySide: { flex: 1, backgroundColor: OVERLAY_COLOR },
  
  // Framing box & animation
  scannerBox: {
    width: 260, height: 260,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: BORDER_WIDTH, height: BORDER_WIDTH, borderColor: CORNER_COLOR, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 16 },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: BORDER_WIDTH, height: BORDER_WIDTH, borderColor: CORNER_COLOR, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 16 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: BORDER_WIDTH, height: BORDER_WIDTH, borderColor: CORNER_COLOR, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 16 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: BORDER_WIDTH, height: BORDER_WIDTH, borderColor: CORNER_COLOR, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 16 },
  scannerLine: {
    width: '100%', height: 2,
    backgroundColor: '#F97316',
    shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 10,
  },
  
  // Bottom part of camera
  overlayBottom: {
    flex: 1.5,
    backgroundColor: OVERLAY_COLOR,
    alignItems: 'center',
    paddingTop: 30,
  },
  instructionText: { color: '#E2E8F0', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  cameraTools: { flexDirection: 'row', gap: 24, marginBottom: 'auto' },
  circleBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  manualEntryBtnOutline: { width: '85%', height: 54, borderRadius: 27, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  manualEntryBtnOutlineText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // Denied Perms
  deniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, marginTop: -60 },
  deniedIconWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 24, position: 'relative' },
  deniedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1E293B', borderRadius: 10, padding: 2 },
  deniedTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  deniedText: { color: '#94A3B8', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  openSettingsBtn: { backgroundColor: '#F97316', width: '80%', height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  openSettingsText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  bottomToolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20, borderTopWidth: 1, borderColor: '#1E293B' },
  toolBtn: { alignItems: 'center' },
  toolBtnTextDisabled: { color: '#64748B', fontSize: 10, marginTop: 6, fontWeight: '600' },
  
  // Error Toast
  errorToast: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#EF4444', borderRadius: 8, flexDirection: 'row', alignItems: 'center', padding: 12, zIndex: 999 },
  errorToastText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  
  // Modals Base
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalDismissArea: { flex: 1 },
  
  // Manual Sheet
  bottomSheetDark: { backgroundColor: '#161D2C', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 32, alignItems: 'center' },
  sheetHeader: { marginBottom: 24 },
  codeIconBubble: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2B211A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F97316' },
  sheetTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  sheetSubtitle: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  otpContainer: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  otpBox: { borderBottomWidth: 2, borderColor: '#334155', width: 40, height: 50, justifyContent: 'center', alignItems: 'center' },
  otpBoxActive: { borderColor: '#F97316' },
  otpDot: { color: '#FFF', fontSize: 32 },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  sheetPrimaryBtn: { width: '100%', height: 54, borderRadius: 27, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  sheetPrimaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  sheetCancelBtn: { width: '100%', height: 54, justifyContent: 'center', alignItems: 'center' },
  sheetCancelBtnText: { color: '#94A3B8', fontSize: 16, fontWeight: '500' },

  // Success Sheet
  bottomSheetWhite: { backgroundColor: '#FFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 32, paddingBottom: 40, alignItems: 'center', marginTop: 'auto' },
  dragPill: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginTop: 12, marginBottom: 24 },
  logoLightRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  logoLightText: { fontSize: 14, fontWeight: '800', color: '#64748B', letterSpacing: 1.5, marginLeft: 8 },
  successCheckCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitleText: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },
  successSubText: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  intoKitchenBtn: { width: '100%', height: 56, borderRadius: 28, backgroundColor: '#F97316', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  intoKitchenBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
