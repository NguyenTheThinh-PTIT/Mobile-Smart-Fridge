import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Household Interfaces
 */
export interface HouseholdMember {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: 'owner' | 'member' | 'admin';
  joinedAt: string;
  avatar?: string;
}

export interface Household {
  id: string;
  name: string;
  inventoryId: number;
  ownerId: string;
  members: HouseholdMember[];
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdState {
  currentHousehold: Household | null;
  members: HouseholdMember[];
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
}

const initialState: HouseholdState = {
  currentHousehold: null,
  members: [],
  loading: false,
  error: null,
  lastFetched: null,
};

/**
 * Household Slice - Redux state for household management
 */
const householdSlice = createSlice({
  name: 'household',
  initialState,
  reducers: {
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) state.error = null;
    },

    // Set current household
    setHousehold: (state, action: PayloadAction<Household>) => {
      const normalizedMembers = action.payload.members.map((m) => ({
        ...m,
        name: m.name ?? "Thành viên chưa đặt tên",
      }));
      state.currentHousehold = {
        ...action.payload,
        members: normalizedMembers,
      };
      state.members = normalizedMembers;
      state.error = null;
      state.lastFetched = new Date().toISOString();
    },

    // Clear household
    clearHousehold: (state) => {
      state.currentHousehold = null;
      state.members = [];
      state.lastFetched = null;
    },

    // Members management
    addMember: (state, action: PayloadAction<HouseholdMember>) => {
      if (state.currentHousehold && !state.members.find(m => m.id === action.payload.id)) {
        state.members.push(action.payload);
        if (state.currentHousehold) {
          state.currentHousehold.members.push(action.payload);
        }
      }
    },

    removeMember: (state, action: PayloadAction<string>) => {
      state.members = state.members.filter(m => m.id !== action.payload);
      if (state.currentHousehold) {
        state.currentHousehold.members = state.currentHousehold.members.filter(m => m.id !== action.payload);
      }
    },

    updateMember: (state, action: PayloadAction<HouseholdMember>) => {
      const index = state.members.findIndex(m => m.id === action.payload.id);
      if (index !== -1) {
        state.members[index] = action.payload;
      }
      if (state.currentHousehold) {
        const householdIndex = state.currentHousehold.members.findIndex(m => m.id === action.payload.id);
        if (householdIndex !== -1) {
          state.currentHousehold.members[householdIndex] = action.payload;
        }
      }
    },

    // Error handling
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Async thunk actions called after login
    fetchHouseholdStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchHouseholdSuccess: (state, action: PayloadAction<Household>) => {
      const normalizedMembers = action.payload.members.map((m) => ({
        ...m,
        name: m.name ?? "Thành viên chưa đặt tên",
      }));
      state.currentHousehold = {
        ...action.payload,
        members: normalizedMembers,
      };
      state.members = normalizedMembers;
      state.loading = false;
      state.error = null;
      state.lastFetched = new Date().toISOString();
    },
    fetchHouseholdFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const householdActions = householdSlice.actions;
export const householdReducer = householdSlice.reducer;

/**
 * Selectors
 */
export const selectCurrentHousehold = (state: { household: HouseholdState }) => state.household.currentHousehold;
export const selectHouseholdMembers = (state: { household: HouseholdState }) => state.household.members;
export const selectHouseholdLoading = (state: { household: HouseholdState }) => state.household.loading;
export const selectHouseholdError = (state: { household: HouseholdState }) => state.household.error;
export const selectHouseholdLastFetched = (state: { household: HouseholdState }) => state.household.lastFetched;

// Selectors for HouseholdContext.tsx
export const selectHousehold = (state: { household: HouseholdState }) => state.household.currentHousehold ?? null;
export const selectHouseholdCurrentUserId = (state: { household: HouseholdState; auth: { user: { id: string } | null } }) => state.auth?.user?.id ?? null;
export const selectHouseholdInvite = (state: { household: HouseholdState }) => null; // Placeholder - implement if needed
