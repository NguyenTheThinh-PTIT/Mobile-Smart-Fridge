import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import { Alert } from 'react-native';
import { useHousehold } from './HouseholdContext';
import { useResponsive } from '@/core/theme/responsive';

export const InviteMemberScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { invite, regenerateInvite, canManageMembers } = useHousehold();
  const [feedback, setFeedback] = useState('');
  const qrRef = useRef<ViewShot>(null);
  const { scale } = useResponsive();

  // Guest restriction: redirect if not manager
  React.useEffect(() => {
    if (!canManageMembers) {
      navigation.replace('HouseholdManagementScreen');
      return;
    }
  }, [canManageMembers, navigation]);

  const onCopyInvite = async () => {
    // Fallback without clipboard lib
    Alert.alert(
      'Link mời',
      invite.link,
      [{ text: 'OK', onPress: () => setFeedback('Đã hiển thị link mời!') }]
    );
  };

  const onDownloadImage = async () => {
    try {
      const uri = await qrRef.current?.capture?.();
      if (uri) {
        setFeedback('Đã chụp ảnh QR: ' + uri);
        // TODO: Save to gallery with expo-media-library
      } else {
        setFeedback('Không thể chụp QR');
      }
    } catch (e) {
      setFeedback('Lỗi lưu ảnh!');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={scale(22)} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mời gia đình & Bạn bè</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.qrCard}>
          <View style={styles.qrWrapOuter}>
            <View style={styles.qrWrapInner}>
              <QRCode
                value={invite.link}
                size={Math.min(scale(220), 260)}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>
          </View>
          <Text style={styles.manualLabel}>Mã nhập tay</Text>
          <Text style={styles.codeText}>{invite.code}</Text>
        </View>

        {/* Removed expire text as per task */}

        {/* <ViewShot ref={qrRef} options={{ format: 'png', quality: 1.0 }}>
          <View style={styles.qrWrapOuter}>
            <View style={styles.qrWrapInner}>
              <QRCode
                value={invite.link}
                size={Math.min(scale(220), 260)}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>
          </View>
        </ViewShot> */}
        <TouchableOpacity style={styles.outlineBtn} onPress={onDownloadImage}>
          <Ionicons name="download-outline" size={scale(18)} color="#0F172A" />
          <Text style={styles.outlineBtnText}>Tải ảnh xuống</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={onCopyInvite} disabled={!canManageMembers}>
          <Ionicons name={canManageMembers ? "copy-outline" : "lock-closed-outline"} size={scale(18)} color="#FFF" />
          <Text style={styles.primaryBtnText}>{canManageMembers ? 'Sao chép Link mời' : 'Chỉ Trưởng nhà'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.regenBtn, !canManageMembers && styles.regenBtnDisabled]} 
          onPress={regenerateInvite} 
          disabled={!canManageMembers}
        >
          <Ionicons name="refresh" size={scale(18)} color="#EA8A22" />
          <Text style={styles.regenText}>Tạo mã mới</Text>
        </TouchableOpacity>

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F7F6' },
  content: { padding: 16, paddingBottom: 28 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  regenBtn: {
    marginTop: 12,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  regenBtnDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.6,
  },
  regenText: {
    color: '#EA8A22',
    fontSize: 18,
    fontWeight: '800',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  qrCard: {
    backgroundColor: '#FFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    alignItems: 'center',
  },
  qrWrapOuter: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    alignItems: 'center',
  },
  qrWrapInner: {
    width: '100%',
    maxWidth: 260,
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  // qrPlaceholder removed - using real QRCode
  manualLabel: {
    marginTop: 14,
    fontSize: 16,
    color: '#64748B',
  },
  codeText: {
    marginTop: 8,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#0F172A',
  },
  expireText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
    color: '#64748B',
  },
  expireHighlight: {
    color: '#EA8A22',
  },
  outlineBtn: {
    marginTop: 16,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFF',
  },
  outlineBtnText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  primaryBtn: {
    marginTop: 12,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EA8A22',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  feedback: {
    marginTop: 10,
    textAlign: 'center',
    color: '#16A34A',
    fontWeight: '600',
  },
  expiredSectionTitleWrap: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  expiredSectionTitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  expiredArea: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
  },
  expiredCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  expiredIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  expiredTitle: {
    fontSize: 32,
    color: '#0F172A',
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  expiredMessage: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 12,
  },
  regenBtn: {
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 21,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  regenText: {
    color: '#EA8A22',
    fontSize: 18,
    fontWeight: '800',
  },
  maskCode: {
    marginTop: 14,
    fontSize: 34,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 4,
  },
});
