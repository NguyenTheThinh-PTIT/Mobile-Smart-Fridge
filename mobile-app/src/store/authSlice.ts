import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { HouseholdRole } from '@/features/account/types';

/**
 * Auth State Interface
 */
export interface AuthState {
  isLoggedIn: boolean;
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  postLoginRedirect: PostLoginRedirect | null;
}

export interface PostLoginRedirect {
  tab: string;
  screen?: string;
  params?: Record<string, unknown>;
}

/**
 * User Interface
 */
export interface User {
  id: string;
  email: string;
  name: string;
  inventoryId?: number;
  avatar?: string;
  inviteCode?: string;
  householdId?: string;
  role?: HouseholdRole;
}

const initialState: AuthState = {
  isLoggedIn: false,
  token: null,
  user: null,
  loading: false,
  error: null,
  postLoginRedirect: null,
};

/**
 * Auth Slice - Redux state cho authentication
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Login actions
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.isLoggedIn = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.loading = false;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.isLoggedIn = false;
    },

    // Register actions
    registerStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    registerSuccess: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.isLoggedIn = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.loading = false;
      state.error = null;
    },
    registerFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Logout
    logout: (state) => {
      state.isLoggedIn = false;
      state.token = null;
      state.user = null;
      state.loading = false;
      state.error = null;
      state.postLoginRedirect = null;
    },

    setPostLoginRedirect: (state, action: PayloadAction<PostLoginRedirect>) => {
      state.postLoginRedirect = action.payload;
    },

    clearPostLoginRedirect: (state) => {
      state.postLoginRedirect = null;
    },

    // Update user profile
    updateUserSuccess: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.error = null;
    },
    updateUserFailure: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Restore session
    restoreSession: (state, action: PayloadAction<{ token: string; user: User } | null>) => {
      if (action.payload) {
        state.isLoggedIn = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
      } else {
        state.isLoggedIn = false;
        state.token = null;
        state.user = null;
        state.postLoginRedirect = null;
      }
    },
  },
});

export const authActions = authSlice.actions;
export const authReducer = authSlice.reducer;

/**
 * Selectors
 */
export const selectIsLoggedIn = (state: { auth: AuthState }) => state.auth.isLoggedIn;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectPostLoginRedirect = (state: { auth: AuthState }) => state.auth.postLoginRedirect;
