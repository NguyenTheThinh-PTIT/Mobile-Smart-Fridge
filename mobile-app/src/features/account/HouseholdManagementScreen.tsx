import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHousehold } from './HouseholdContext';
import { HouseholdMember } from './types';
import { MemberActionSheet } from './components/MemberActionSheet';
import { RemoveMemberConfirmModal } from './components/RemoveMemberConfirmModal';
import { AccessDeniedModal } from './components/AccessDeniedModal';
import { ActivityIndicator } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  selectHouseholdLoading, 
  selectHouseholdError 
} from '@/store/householdSlice';
import { fetchHousehold } from '@/store/householdThunks';
import { useResponsive } from '@/core/theme/responsive';

export const HouseholdManagementScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const {
    household,
    members,
    currentUserId,
    canManageMembers,
    refreshOverview,
    transferOwnership,
    removeMember,
    leaveHousehold,
  } = useHousehold();

  const dispatch = useAppDispatch();
  const householdLoading = useAppSelector(selectHouseholdLoading);
  const householdError = useAppSelector(selectHouseholdError);

  const [selectedMember, setSelectedMember] = useState<HouseholdMember | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showDenied, setShowDenied] = useState(false);
  const [showJoinToast, setShowJoinToast] = useState(false);
  const toastOpacity = React.useRef(new Animated.Value(0)).current;
  const { scale } = useResponsive();

  const memberCountLabel = `${members.length}/${household.maxMembers}`;
  const isCurrentUserOwner = useMemo(
    () => members.find((member) => member.id === currentUserId)?.role === 'OWNER',
    [members, currentUserId]
  );

  React.useEffect(() => {
    const shouldRefresh = !!route?.params?.refreshHousehold;
    if (!shouldRefresh) {
      return;
    }

    refreshOverview().finally(() => {
      navigation.setParams?.({ refreshHousehold: undefined, fromJoin: undefined });
    });
  }, [navigation, refreshOverview, route?.params?.refreshHousehold]);

  React.useEffect(() => {
    const fromJoin = !!route?.params?.fromJoin;
    if (!fromJoin) {
      return;
    }

    setShowJoinToast(true);
    toastOpacity.setValue(0);

    const fadeIn = Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    });

    const fadeOut = Animated.timing(toastOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    });

    fadeIn.start();

    const fadeOutTimer = setTimeout(() => {
      fadeOut.start();
    }, 2200);

    const timer = setTimeout(() => {
      setShowJoinToast(false);
      navigation.setParams?.({ fromJoin: undefined });
    }, 2600);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(timer);
    };
  }, [navigation, route?.params?.fromJoin, toastOpacity]);

  const openMemberAction = (member: HouseholdMember) => {
    setSelectedMember(member);
    setShowActionSheet(true);
  };

  const handleTransferOwner = () => {
    if (!selectedMember) {
      return;
    }

    if (!canManageMembers) {
      setShowDenied(true);
      return;
    }

    transferOwnership(selectedMember.id);
    setShowActionSheet(false);
  };

  const handleRemoveMember = () => {
    if (!selectedMember) {
      return;
    }

    if (!canManageMembers) {
      setShowDenied(true);
      return;
    }

    setShowActionSheet(false);
    setShowRemoveConfirm(true);
  };

  const confirmRemoveMember = () => {
    if (!selectedMember) {
      return;
    }

    removeMember(selectedMember.id);
    setShowRemoveConfirm(false);
    setSelectedMember(null);
  };

  return (
<SafeAreaView style={styles.safeArea}>
      {/* 🆕 Household Loading/Error States */}
      {householdLoading ? (
        <View style={[styles.successToast, styles.loadingToast]}>
          <ActivityIndicator size="small" color="#F97316" />
          <Text style={styles.loadingText}>Đang tải thông tin bếp...</Text>
        </View>
      ) : householdError ? (
        <View style={[styles.successToast, styles.errorToast]}>
          <Ionicons name="alert-circle" size={scale(18)} color="#EF4444" />
          <Text style={styles.errorToastText}>{householdError}</Text>
          <TouchableOpacity onPress={() => dispatch(fetchHousehold())}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : showJoinToast && (
        <Animated.View style={[styles.successToast, { opacity: toastOpacity }]}>
          <Ionicons name="checkmark-circle" size={scale(18)} color="#10B981" />
          <Text style={styles.successToastText}>Đã tham gia bếp thành công</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={scale(20)} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quản lý thành viên</Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.householdCard}>
          <View>
            <Text style={styles.householdName}>{household.name}</Text>
            <Text style={styles.memberCount}>Số lượng thành viên: {memberCountLabel}</Text>
          </View>
          <TouchableOpacity style={styles.editBadge}>
            <Ionicons name="pencil-outline" size={scale(16)} color="#64748B" />
          </TouchableOpacity>
        </View>

{canManageMembers ? (
        <TouchableOpacity style={styles.inviteBtn} onPress={() => navigation.navigate('InviteMember')}>
          <Ionicons name="qr-code-outline" size={scale(18)} color="#EA8A22" />
          <Text style={styles.inviteBtnText}>Mời thành viên mới</Text>
          <Ionicons name="add-circle-outline" size={scale(18)} color="#EA8A22" />
        </TouchableOpacity>
      ) : (
        <View style={[styles.inviteBtn, styles.inviteBtnDisabled]}>
          <Ionicons name="qr-code-outline" size={scale(18)} color="#CBD5E1" />
          <Text style={[styles.inviteBtnText, styles.inviteBtnTextDisabled]}>Chỉ Trưởng nhà mời được</Text>
          <Ionicons name="lock-closed-outline" size={scale(18)} color="#CBD5E1" />
        </View>
      )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Thành viên gia đình</Text>
          <Text style={styles.sectionSub}>ĐANG HOẠT ĐỘNG</Text>
        </View>

        {members.map((member) => {
          const isOwner = member.role === 'OWNER';
          const isCurrent = member.id === currentUserId;

          return (
            <TouchableOpacity
              key={member.id}
              style={[styles.memberCard, isCurrent && styles.memberCardCurrent]}
              onPress={() => openMemberAction(member)}
              activeOpacity={0.88}
            >
              <View style={styles.memberAvatarWrap}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{member.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                {member.isOnline && <View style={styles.onlineDot} />}
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <View style={[styles.roleBadge, isOwner ? styles.ownerBadge : styles.memberBadge]}>
                    <Text style={[styles.roleText, isOwner ? styles.ownerText : styles.memberText]}>
                      {isOwner ? 'TRƯỞNG NHÀ' : 'THÀNH VIÊN'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.memberEmail}>{member.email}</Text>
              </View>

              <Ionicons name="chevron-forward" size={scale(18)} color="#CBD5E1" />
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.leaveBtn}
          onPress={() => {
            if (!isCurrentUserOwner) {
              leaveHousehold();
            } else {
              setShowDenied(true);
            }
          }}
        >
          <Ionicons name="log-out-outline" size={scale(18)} color="#EF4444" />
          <Text style={styles.leaveText}>Rời khỏi Bếp này</Text>
        </TouchableOpacity>
      </ScrollView>

      <MemberActionSheet
        visible={showActionSheet}
        member={selectedMember}
        onClose={() => setShowActionSheet(false)}
        onTransferOwner={handleTransferOwner}
        onRemoveMember={handleRemoveMember}
      />

      <RemoveMemberConfirmModal
        visible={showRemoveConfirm}
        memberName={selectedMember?.name ?? ''}
        onCancel={() => setShowRemoveConfirm(false)}
        onConfirm={confirmRemoveMember}
      />

      <AccessDeniedModal visible={showDenied} onClose={() => setShowDenied(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F7F6' },
  successToast: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteBtnDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderStyle: 'solid',
  },
  inviteBtnTextDisabled: {
    color: '#94A3B8',
  },
  loadingToast: {
    borderColor: '#FCD34D',
    backgroundColor: '#FEF3C7',
  },
  errorToast: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  loadingText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '700',
  },
  errorToastText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  retryText: {
    color: '#F97316',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  successToastText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '700',
  },
  content: { padding: 16, paddingBottom: 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  householdCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  householdName: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
  },
  memberCount: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  editBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtn: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#EA8A22',
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  inviteBtnText: {
    color: '#EA8A22',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  memberCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCardCurrent: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  memberAvatarWrap: {
    width: 52,
    marginRight: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#334155',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFF',
    position: 'absolute',
    right: 0,
    bottom: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ownerBadge: {
    backgroundColor: '#FFEDD5',
  },
  memberBadge: {
    backgroundColor: '#E2E8F0',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '900',
  },
  ownerText: {
    color: '#EA8A22',
  },
  memberText: {
    color: '#64748B',
  },
  memberEmail: {
    fontSize: 14,
    color: '#64748B',
  },
  leaveBtn: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFF',
  },
  leaveText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '800',
  },
});
