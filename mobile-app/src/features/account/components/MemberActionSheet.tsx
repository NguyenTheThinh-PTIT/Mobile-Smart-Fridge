import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HouseholdMember } from '../types';
import { useResponsive } from '@/core/theme/responsive';

interface MemberActionSheetProps {
  visible: boolean;
  member: HouseholdMember | null;
  onClose: () => void;
  onTransferOwner: () => void;
  onRemoveMember: () => void;
}

export const MemberActionSheet: React.FC<MemberActionSheetProps> = ({
  visible,
  member,
  onClose,
  onTransferOwner,
  onRemoveMember,
}) => {
  const { scale } = useResponsive();

  if (!member) {
    return null;
  }

  return (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{member.name.slice(0, 1).toUpperCase()}</Text>
          </View>

          <Text style={styles.name}>{member.name}</Text>
          <Text style={styles.joined}>Đã tham gia: {member.joinedAt}</Text>

          <TouchableOpacity style={styles.actionRow} onPress={onTransferOwner} activeOpacity={0.85}>
            <View style={[styles.actionIconWrap, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="trophy-outline" size={scale(20)} color="#EA8A22" />
            </View>
            <Text style={styles.actionText}>Chuyển quyền Trưởng nhà</Text>
            <Ionicons name="chevron-forward" size={scale(18)} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={onRemoveMember} activeOpacity={0.85}>
            <View style={[styles.actionIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={scale(20)} color="#EF4444" />
            </View>
            <Text style={[styles.actionText, { color: '#EF4444' }]}>Xóa khỏi Bếp này</Text>
            <Ionicons name="chevron-forward" size={scale(18)} color="#FCA5A5" />
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  grabber: {
    width: 46,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDE7CF',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#334155',
  },
  name: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
  },
  joined: {
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 20,
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
  },
});
