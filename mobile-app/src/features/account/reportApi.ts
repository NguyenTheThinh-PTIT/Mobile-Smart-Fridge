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

  /**
   * Fetch report summary for the given period.
   * Response contains: consumedCount, wasteCount, wasteRatePercent,
   * cookingTrend (7-day points) and a small cookingHistory array.
   */

  getConsumedFoods: async (period: ReportPeriod, query: string): Promise<FoodListResponse> => {
    try {
      return await axiosClient.get('/reports/consumed', { params: { period, query } });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Fetch a list of consumed foods aggregated for the period.
   * The `query` param is used for case-insensitive name filtering on the server.
   */

  getWastedFoods: async (period: ReportPeriod, query: string): Promise<FoodListResponse> => {
    try {
      return await axiosClient.get('/reports/wasted', { params: { period, query } });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Fetch a list of wasted foods (expired/discarded) for the period.
   * "Wasted" means inventory batches with status in ('expired','wasted','discarded').
   */

  getCookingHistory: async (period: ReportPeriod): Promise<CookingHistoryResponse> => {
    try {
      return await axiosClient.get('/reports/cooking-history', { params: { period, limit: 50 } });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Fetch recent cooking history for the period. Client uses a hardcoded
   * limit=50 here to bound the response size for list views.
   */

  getInsights: async (period: ReportPeriod): Promise<ReportInsightsResponse> => {
    try {
      return await axiosClient.get('/reports/insights', { params: { period } });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Fetch report insights grouped into: expiryRisk, mealTypeDistribution,
   * wasteByCategory and topConsumedFoods. Used to populate dashboard insights.
   */
};
