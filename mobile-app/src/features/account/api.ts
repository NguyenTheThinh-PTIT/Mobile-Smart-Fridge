import { axiosClient } from '@/core/network/AxiosClient';
import { ExceptionHandler } from '@/core/error/ExceptionHandler';
import { HouseholdInfo, HouseholdMember } from './types';

export interface InviteState {
  code: string;
  expiresInHours: number;
  expired: boolean;
  link: string;
}

export interface HouseholdOverviewResponse {
  household: HouseholdInfo;
  members: HouseholdMember[];
  currentUserId: string;
  invite: InviteState;
}

export const householdApi = {
  getOverview: async (): Promise<HouseholdOverviewResponse> => {
    try {
      return await axiosClient.get('/household/overview');
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  regenerateInvite: async (): Promise<InviteState> => {
    try {
      return await axiosClient.post('/household/invite/regenerate');
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  acceptInvite: async (code: string): Promise<HouseholdOverviewResponse> => {
    try {
      return await axiosClient.post('/household/invite/accept', { code });
    } catch (error) {
      console.warn('Invite accept failed - may already joined', error);
      return householdApi.getOverview(); // Fallback to overview
    }
  },

  /** Safe guest join - idempotent for already joined users */
  ensureGuestJoin: async (inviteCode?: string): Promise<HouseholdOverviewResponse> => {
    if (!inviteCode) return householdApi.getOverview();
    try {
      return await householdApi.acceptInvite(inviteCode);
    } catch (error) {
      return householdApi.getOverview(); // Fallback
    }
  },

  transferOwnership: async (memberId: string): Promise<void> => {
    try {
      await axiosClient.post(`/household/members/${memberId}/transfer-owner`);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  removeMember: async (memberId: string): Promise<void> => {
    try {
      await axiosClient.delete(`/household/members/${memberId}`);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  leaveHousehold: async (): Promise<void> => {
    try {
      await axiosClient.post('/household/leave');
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },
};
