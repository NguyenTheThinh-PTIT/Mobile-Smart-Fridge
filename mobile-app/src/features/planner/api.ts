import { axiosClient } from '@/core/network/AxiosClient';
import { ExceptionHandler } from '@/core/error/ExceptionHandler';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface MealPlan {
  id: number;
  userId: number;
  mealType: string;
  plannedDate: string;
  notes?: string | null;
  expectedDiners?: number;
  actualDiners?: number;
  guestCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MealPlanPayload {
  mealType: MealType;
  plannedDate: string;
  notes?: string;
  expectedDiners?: number;
  guestCount?: number;
}

const unwrapApiData = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }

  return payload as T;
};

const ensureMealPlanArray = (payload: unknown): MealPlan[] => {
  const data = unwrapApiData<unknown>(payload);
  if (Array.isArray(data)) {
    return data as MealPlan[];
  }

  return [];
};

export const plannerApi = {
  getMealPlansByUser: async (userId: number): Promise<MealPlan[]> => {
    try {
      const payload = await axiosClient.get<unknown>(`/users/${userId}/meals`);
      return ensureMealPlanArray(payload);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  getMealPlanById: async (userId: number, mealPlanId: number): Promise<MealPlan> => {
    try {
      const payload = await axiosClient.get<unknown>(`/users/${userId}/meals/${mealPlanId}`);
      return unwrapApiData<MealPlan>(payload);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  createMealPlan: async (userId: number, payload: MealPlanPayload): Promise<MealPlan> => {
    try {
      const response = await axiosClient.post<unknown>(`/users/${userId}/meals`, payload);
      return unwrapApiData<MealPlan>(response);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  updateMealPlan: async (
    userId: number,
    mealPlanId: number,
    payload: MealPlanPayload
  ): Promise<MealPlan> => {
    try {
      const response = await axiosClient.put<unknown>(`/users/${userId}/meals/${mealPlanId}`, payload);
      return unwrapApiData<MealPlan>(response);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },
};
