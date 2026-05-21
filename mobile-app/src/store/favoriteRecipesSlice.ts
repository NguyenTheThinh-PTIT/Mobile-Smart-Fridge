import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FavoriteRecipe {
  recipeId: number;
  recipeName: string;
  cookTimeMinutes: number;
  caloriesKcal?: number;
  difficulty?: string;
  cuisineType?: string;
  availableIngredients: string[];
  missingIngredients: string[];
  reason?: string;
  warningMessage?: string | null;
  source: 'ready' | 'needToBuy' | 'search';
  createdAt: string;
}

interface FavoriteRecipesState {
  items: FavoriteRecipe[];
}

const initialState: FavoriteRecipesState = {
  items: [],
};

const favoriteRecipesSlice = createSlice({
  name: 'favoriteRecipes',
  initialState,
  reducers: {
    addFavoriteRecipe: (state, action: PayloadAction<FavoriteRecipe>) => {
      const existed = state.items.some((item) => item.recipeId === action.payload.recipeId);
      if (existed) {
        return;
      }

      state.items = [action.payload, ...state.items];
    },
    removeFavoriteRecipe: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((item) => item.recipeId !== action.payload);
    },
    clearFavoriteRecipes: (state) => {
      state.items = [];
    },
  },
});

export const favoriteRecipesActions = favoriteRecipesSlice.actions;
export const favoriteRecipesReducer = favoriteRecipesSlice.reducer;

export const selectFavoriteRecipes = (state: { favoriteRecipes: FavoriteRecipesState }) =>
  state.favoriteRecipes.items;

export const selectIsRecipeFavorite =
  (recipeId: number) => (state: { favoriteRecipes: FavoriteRecipesState }) =>
    state.favoriteRecipes.items.some((item) => item.recipeId === recipeId);
