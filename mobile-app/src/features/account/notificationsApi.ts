import { ExceptionHandler } from '@/core/error/ExceptionHandler';
import { axiosClient } from '@/core/network/AxiosClient';

export type NotificationType =
  | 'ingredient_expiring'
  | 'member_joined'
  | 'shopping_reminder'
  | 'meal_attendance_confirm'
  | 'meal_attendance_broadcast'
  | 'meal_starting_soon'
  | 'general';

export interface AppNotification {
  id: number;
  householdId: number;
  userId?: number | null;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  actionRequired: boolean;
  actionTaken: boolean;
  relatedMealId?: number | null;
  metadata?: string | null;
  createdAt?: string | null;
  readAt?: string | null;
}

export const countUnreadNotifications = (notifications: AppNotification[]): number =>
  notifications.filter((item) => {
    if (item.isRead === true) {
      return false;
    }

    if (item.readAt && String(item.readAt).trim().length > 0) {
      return false;
    }

    return true;
  }).length;

const unwrapApiData = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }

  return payload as T;
};

export const notificationsApi = {
  getNotifications: async (userId: number): Promise<AppNotification[]> => {
    try {
      const payload = await axiosClient.get<unknown>(`/users/${userId}/notifications`);
      const data = unwrapApiData<unknown>(payload);
      return Array.isArray(data) ? (data as AppNotification[]) : [];
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  markAsRead: async (userId: number, notificationId: number): Promise<AppNotification> => {
    try {
      const payload = await axiosClient.patch<unknown>(
        `/users/${userId}/notifications/${notificationId}/read`,
        {}
      );
      return unwrapApiData<AppNotification>(payload);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  respondMealAttendance: async (
    userId: number,
    notificationId: number,
    willEat: boolean
  ): Promise<AppNotification> => {
    try {
      const payload = await axiosClient.post<unknown>(
        `/users/${userId}/notifications/${notificationId}/meal-response`,
        { willEat }
      );
      return unwrapApiData<AppNotification>(payload);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },
};
