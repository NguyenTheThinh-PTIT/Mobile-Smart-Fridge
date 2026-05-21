import { ExceptionHandler } from '@/core/error/ExceptionHandler';
import { axiosClient } from '@/core/network/AxiosClient';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MissingIngredient {
  food_name: string;
  required: number;
  available: number;
  unit: string;
}

export interface SuggestedRecipe {
  recipe_id: number;
  recipe_name: string;
  cook_time_minutes: number;
  calories_kcal?: number;
  difficulty: string;
  cuisine_type: string;
  coverage_ratio: number;
  missing_ingredients: MissingIngredient[];
  available_ingredients: string[];
  uses_expiring_ingredients: string[];
  reason: string;
  highlight: string;
  allergy_overlap?: string[];
  warning_message?: string | null;
}

export interface SuggestionResponse {
  fully_covered: SuggestedRecipe[];
  partially_covered: SuggestedRecipe[];
  weather_context: string;
  generated_at: string;
}

export interface SuggestionParams {
  householdId: number;
  mealType: MealType;
  lat: number;
  lon: number;
  maxCookMinutes?: number;
}

export interface RecipeSearchItem {
  recipe_id: number;
  recipe_name: string;
  cook_time_minutes: number;
  calories_kcal?: number;
  difficulty: string;
  cuisine_type: string;
  allergy_overlap: string[];
  warning_message: string | null;
}

export interface RecipeSearchResponse {
  query: string;
  household_id: number;
  total: number;
  results: RecipeSearchItem[];
}

export type RecipeSourceType = 'ready' | 'needToBuy' | 'search';

export interface RecipeDetailParams {
  recipeId: number;
  recipeName: string;
  mealId?: number;
  cookTimeMinutes: number;
  caloriesKcal?: number;
  difficulty?: string;
  cuisineType?: string;
  source: RecipeSourceType;
  availableIngredients: string[];
  missingIngredients: string[];
  reason?: string;
  warningMessage?: string | null;
}

export interface RecipeIngredientItem {
  foodId: number;
  foodName: string;
  requiredPerPerson: number;
  unit: string;
  defaultTotalQuantity: number;
}

export interface RecipeStepItem {
  stepNumber: number;
  instruction: string;
  mediaUrl?: string | null;
}

export interface RecipeCookGuideResponse {
  recipeId: number;
  recipeName: string;
  mealId: number;
  actualDiners: number;
  ingredients: RecipeIngredientItem[];
  steps: RecipeStepItem[];
  note: string;
}

export interface RecipeConsumptionItemRequest {
  foodId: number;
  consumedQuantity: number;
  unit: string;
}

export interface RecipeConsumeRequest {
  mealId?: number;
  actualDiners: number;
  items: RecipeConsumptionItemRequest[];
}

const getAiSuggestionUrl = () => {
  const envAiApiUrl =
    process.env.EXPO_PUBLIC_AI_API_URL ||
    process.env.REACT_APP_AI_API_URL ||
    'http://localhost:8001';

  return `${envAiApiUrl.replace(/\/$/, '')}/api/v1/suggestions`;
};

export const recipesApi = {
  getSuggestions: async (params: SuggestionParams): Promise<SuggestionResponse> => {
    try {
      const url = getAiSuggestionUrl();

      return await axiosClient.get<SuggestionResponse>(url, {
        params: {
          household_id: params.householdId,
          meal_type: params.mealType,
          lat: params.lat,
          lon: params.lon,
          max_cook_minutes: params.maxCookMinutes,
        },
      });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  searchRecipes: async (params: {
    householdId: number;
    query: string;
    mealId?: number;
    limit?: number;
  }): Promise<RecipeSearchResponse> => {
    try {
      const url = `${getAiSuggestionUrl().replace('/api/v1/suggestions', '')}/api/v1/recipes/search`;
      return await axiosClient.get<RecipeSearchResponse>(url, {
        params: {
          household_id: params.householdId,
          query: params.query,
          meal_id: params.mealId,
          limit: params.limit,
        },
      });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  searchRecipesByTag: async (params: {
    householdId: number;
    tagType: string;
    tagValue: string;
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<RecipeSearchResponse> => {
    try {
      const url = `${getAiSuggestionUrl().replace('/api/v1/suggestions', '')}/api/v1/recipes/by-tag`;
      return await axiosClient.get<RecipeSearchResponse>(url, {
        params: {
          household_id: params.householdId,
          tag_type: params.tagType,
          tag_value: params.tagValue,
          query: params.query || '',
          limit: params.limit || 20,
          offset: params.offset || 0,
        },
      });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  getAllRecipeCatalog: async (params: SuggestionParams): Promise<SuggestionResponse> => {
    try {
      const url = `${getAiSuggestionUrl().replace('/api/v1/suggestions', '')}/api/v1/recipes/all-catalog`;

      return await axiosClient.get<SuggestionResponse>(url, {
        params: {
          household_id: params.householdId,
          meal_type: params.mealType,
          lat: params.lat,
          lon: params.lon,
          max_cook_minutes: params.maxCookMinutes,
        },
      });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  getCookGuide: async (recipeId: number, mealId?: number): Promise<RecipeCookGuideResponse> => {
    try {
      return await axiosClient.get<RecipeCookGuideResponse>(`/recipes/${recipeId}/cook-guide`, {
        params: {
          mealId,
        },
      });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  consumeIngredients: async (recipeId: number, payload: RecipeConsumeRequest): Promise<void> => {
    try {
      await axiosClient.post(`/recipes/${recipeId}/consume`, payload);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  // User Recipe Management APIs
  getUserRecipes: async (householdId: number): Promise<any[]> => {
    try {
      return await axiosClient.get<any[]>('/recipes/household', {
        params: { householdId, source: 'user' }
      });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  createUserRecipe: async (householdId: number, payload: any): Promise<any> => {
    try {
      return await axiosClient.post('/recipes', {
        ...payload,
        householdId,
        source: 'user',
      });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  updateUserRecipe: async (recipeId: number, payload: any): Promise<any> => {
    try {
      return await axiosClient.put(`/recipes/${recipeId}`, {
        ...payload,
        source: 'user',
      });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  deleteUserRecipe: async (recipeId: number): Promise<void> => {
    try {
      await axiosClient.delete(`/recipes/${recipeId}`);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  getAllFoods: async (): Promise<any[]> => {
    try {
      return await axiosClient.get<any[]>('/foods');
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },
};
