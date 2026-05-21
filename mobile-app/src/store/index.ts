import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authReducer } from './authSlice';
import { favoriteRecipesReducer } from './favoriteRecipesSlice';

/**
 * Persist config
 */
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'favoriteRecipes'],
};

/**
 * Root reducer
 */
import { householdReducer } from './householdSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  favoriteRecipes: favoriteRecipesReducer,
  household: householdReducer,
});

/**
 * Persisted reducer
 */
const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * Store
 */
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

/**
 * Persistor
 */
export const persistor = persistStore(store);

/**
 * RootState type
 */
export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export default store;
