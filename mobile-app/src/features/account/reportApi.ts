import { axiosClient } from '@/core/network/AxiosClient';
import { ExceptionHandler } from '@/core/error/ExceptionHandler';

export type ReportPeriod = 'WEEK' | 'MONTH' | 'YEAR';

export interface HourlyCostPoint {
  label: string;
  count: number;
}

export interface CookingHistoryItem {
  dishId: number;
  dishName: string;
  ingredients: string;
  rating: number;
  cookMinutes: number;
  scheduledAt: string;
  imageUrl: string;
}

export interface FoodStatItem {
  name: string;
  quantity: number;
  unit: string;
  occurrenceCount: number;
  ratioPercent: number;
}

export interface ReportSummaryResponse {
  period: ReportPeriod;
  consumedCount: number;
  wasteCount: number;
  wasteRatePercent: number;
  cookingTrend: HourlyCostPoint[];
  cookingHistory: CookingHistoryItem[];
}

export interface FoodListResponse {
  period: ReportPeriod;
  items: FoodStatItem[];
}

export interface CookingHistoryResponse {
  period: ReportPeriod;
  items: CookingHistoryItem[];
}

export interface ExpiryRiskItem {
  foodName: string;
  quantity: number;
  unit: string;
  expirationDate: string;
  daysToExpire: number;
  riskLevel: string;
}

export interface MealTypePoint {
  mealType: string;
  count: number;
  ratioPercent: number;
}

export interface CategoryWastePoint {
  categoryName: string;
  quantity: number;
  unit: string;
  ratioPercent: number;
}

export interface ReportInsightsResponse {
  period: ReportPeriod;
  expiryRisk: ExpiryRiskItem[];
  mealTypeDistribution: MealTypePoint[];
  wasteByCategory: CategoryWastePoint[];
  topConsumedFoods: FoodStatItem[];
}

export const reportApi = {
  getSummary: async (period: ReportPeriod): Promise<ReportSummaryResponse> => {
    try {
      return await axiosClient.get('/reports/summary', { params: { period } });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  getConsumedFoods: async (period: ReportPeriod, query: string): Promise<FoodListResponse> => {
    try {
      return await axiosClient.get('/reports/consumed', { params: { period, query } });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  getWastedFoods: async (period: ReportPeriod, query: string): Promise<FoodListResponse> => {
    try {
      return await axiosClient.get('/reports/wasted', { params: { period, query } });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  getCookingHistory: async (period: ReportPeriod): Promise<CookingHistoryResponse> => {
    try {
      return await axiosClient.get('/reports/cooking-history', { params: { period, limit: 50 } });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  getInsights: async (period: ReportPeriod): Promise<ReportInsightsResponse> => {
    try {
      return await axiosClient.get('/reports/insights', { params: { period } });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },
};
