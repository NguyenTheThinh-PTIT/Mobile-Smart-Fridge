import { createAsyncThunk } from '@reduxjs/toolkit';
import { axiosClient } from '@/core/network/AxiosClient';
import { ExceptionHandler } from '@/core/error/ExceptionHandler';
import { Household } from './householdSlice';

/**
 * Fetch household overview data
 * Called after login success, especially QR invite flow
 */
export const fetchHousehold = createAsyncThunk<
  Household, 
  void, 
  { rejectValue: string }
>(
  'household/fetchHousehold',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/household/overview');
      return response.data as Household;
    } catch (error) {
      const message = ExceptionHandler.handleError(error).message;
      return rejectWithValue(`Household load failed: ${message}`);
    }
  }
);

export const householdThunks = { fetchHousehold };
