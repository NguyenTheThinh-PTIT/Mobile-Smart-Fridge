import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import { useResponsive } from '@/core/theme/responsive';
import { axiosClient } from '@/core/network/AxiosClient';
import { FOODI_LOGO_SVG } from '@/core/constants/brandLogo';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/authSlice';
import { AppNotification, countUnreadNotifications } from '@/features/account/notificationsApi';

export const AppHeader: React.FC<{
  onPressSun?: () => void;
  onPressNotification?: () => void;
  marginBottom?: number;
  leftAction?: 'schedule' | 'back';
  onPressLeft?: () => void;
}> = ({ onPressSun, onPressNotification, marginBottom, leftAction = 'schedule', onPressLeft }) => {
  const navigation = useNavigation<any>();
  const user = useAppSelector(selectUser);
  const { scale } = useResponsive();
  const styles = React.useMemo(() => createStyles(scale), [scale]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const userId = React.useMemo(() => {
    const parsed = Number(user?.id);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }, [user?.id]);

  const loadUnreadCount = React.useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    try {
      const payload = await axiosClient.get<unknown>(`/users/${userId}/notifications`);
      const data =
        payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)
          ? (payload as { data: unknown }).data
          : payload;

      if (!Array.isArray(data)) {
        setUnreadCount(0);
        return;
      }

      const unread = countUnreadNotifications(data as AppNotification[]);
      setUnreadCount(unread);
    } catch {
      return;
    }
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      loadUnreadCount();
      return undefined;
    }, [loadUnreadCount])
  );

  const handlePressLeftButton = React.useCallback(() => {
    if (onPressLeft) {
      onPressLeft();
      return;
    }

    if (leftAction === 'back') {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
      return;
    }

    if (onPressSun) {
      onPressSun();
      return;
    }

    const rootNavigation = navigation.getParent?.()?.getParent?.() ?? navigation.getParent?.();
    if (rootNavigation?.navigate) {
      rootNavigation.navigate('MainTabs', {
        screen: 'Planner',
      });
      return;
    }

    navigation.navigate('MainTabs', {
      screen: 'Planner',
    });
  }, [leftAction, navigation, onPressLeft, onPressSun]);

  const handlePressNotification = React.useCallback(() => {
    if (onPressNotification) {
      onPressNotification();
      return;
    }

    const parentNavigation = navigation.getParent?.();
    if (parentNavigation?.navigate) {
      parentNavigation.navigate('MainTabs', {
        screen: 'NotificationsCenter',
      });
      return;
    }

    navigation.navigate('NotificationsCenter');
  }, [navigation, onPressNotification]);

  return (
    <View style={[styles.topRow, marginBottom ? { marginBottom } : null]}>
      <View style={styles.headerSide}>
        <TouchableOpacity style={styles.sunBtn} activeOpacity={0.85} onPress={handlePressLeftButton}>
          <Ionicons
            name={leftAction === 'back' ? 'chevron-back' : 'calendar-outline'}
            size={scale(20)}
            color="#181C2E"
          />
        </TouchableOpacity>
      </View>

      <SvgXml xml={FOODI_LOGO_SVG} width={scale(122)} height={scale(59)} />

      <View style={styles.headerSide}>
        <TouchableOpacity style={styles.notificationWrap} activeOpacity={0.85} onPress={handlePressNotification}>
          {unreadCount > 0 ? (
            <View style={[styles.notificationBadge, unreadCount > 99 ? styles.notificationBadgeLarge : null]}>
              <Text style={styles.notificationBadgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
            </View>
          ) : null}
          <View style={styles.notifyButton}>
            <Ionicons name="notifications-outline" size={scale(20)} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (scale: (size: number) => number) =>
  StyleSheet.create({
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: scale(24),
    },
    headerSide: {
      width: scale(45),
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    sunBtn: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(20),
      backgroundColor: '#ECF0F4',
      alignItems: 'center',
      justifyContent: 'center',
    },
    notificationWrap: {
      width: scale(45),
      height: scale(54),
      alignItems: 'center',
      justifyContent: 'flex-end',
      position: 'relative',
    },
    notificationBadge: {
      position: 'absolute',
      top: scale(0),
      right: scale(-4),
      width: scale(27),
      height: scale(27),
      borderRadius: scale(20),
      backgroundColor: '#FF7622',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    notificationBadgeLarge: {
      minWidth: scale(24),
      width: 'auto',
      paddingHorizontal: scale(5),
    },
    notificationBadgeText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: scale(11),
    },
    notifyButton: {
      width: scale(45),
      height: scale(45),
      borderRadius: scale(23),
      backgroundColor: '#181C2E',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
