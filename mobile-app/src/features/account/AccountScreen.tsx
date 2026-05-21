import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '@/store/hooks';
import { authActions } from '@/store/authSlice';
import { useResponsive } from '@/core/theme/responsive';
import { userApi } from '@/features/auth/api';
import { AppHeader } from '@/core/base_widgets';

const MENU_ITEMS = [
  { id: 'report', label: 'Báo cáo', icon: 'stats-chart-outline', route: 'ReportSummary' },
  { id: 'profile', label: 'Cài đặt tài khoản', icon: 'person-circle-outline', route: 'ProfileSettings' },
  { id: 'household', label: 'Quản lý thành viên', icon: 'people-outline', route: 'HouseholdManagement' },
  { id: 'recipes', label: 'Quản lý công thức', icon: 'restaurant-outline', route: 'RecipeManagement' },
  { id: 'favorites', label: 'Danh sách món ăn yêu thích', icon: 'heart-outline', route: 'FavoriteRecipes' },
  { id: 'notifications', label: 'Thông báo', icon: 'notifications-outline', route: 'Notifications' },
  { id: 'help', label: 'Trợ giúp', icon: 'help-circle-outline', route: 'Help' },
];

export const AccountScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { scale } = useResponsive();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await userApi.getProfile();
        if (mounted) setProfile(res?.user || res);
      } catch (err: any) {
        setError('Không thể tải thông tin tài khoản');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, []);

  const getAvatarText = () => {
    if (!profile?.name) return '?';
    return profile.name.trim().charAt(0).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader />

        <Text style={styles.title}>Quản trị tài khoản</Text>
        <Text style={styles.subtitle}>Quản lý thông tin cá nhân, thành viên gia đình và các thiết lập liên quan.</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.avatarText}>{getAvatarText()}</Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            {loading ? (
              <Text style={styles.name}>Đang tải...</Text>
            ) : error ? (
              <Text style={[styles.name, { color: '#EF4444' }]}>{error}</Text>
            ) : (
              <>
                <Text style={styles.name}>{profile?.name || 'Không rõ'}</Text>
                <Text style={styles.email}>{profile?.email || ''}</Text>
                {/* Nếu có role thì hiển thị, mặc định là 'Thành viên' */}
                <Text style={styles.role}>{profile?.role || 'Thành viên'}</Text>
              </>
            )}
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ProfileSettings')}>
            <Ionicons name="pencil-outline" size={scale(18)} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuRow, index === MENU_ITEMS.length - 1 && styles.menuRowLast]}
              onPress={() => navigation.navigate(item.route)}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name={item.icon as any} size={scale(20)} color="#64748B" />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={scale(18)} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => dispatch(authActions.logout())}>
          <Ionicons name="log-out-outline" size={scale(18)} color="#EF4444" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F7F6' },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 22, color: '#64748B', marginBottom: 16 },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  profileInfo: { flex: 1, marginLeft: 12 },
  name: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  email: { fontSize: 13, color: '#64748B', marginTop: 2 },
  role: { fontSize: 12, color: '#EA8A22', fontWeight: '700', marginTop: 4 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  menuLabel: { flex: 1, fontSize: 15, color: '#0F172A', fontWeight: '700' },
  logoutBtn: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '900' },
});
