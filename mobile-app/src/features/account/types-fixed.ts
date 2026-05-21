export type HouseholdRole = 'OWNER' | 'MEMBER';

export interface HouseholdMember {
  id: string;
  name: string | null;
  email: string;
  role: HouseholdRole;
  joinedAt: string;
  isOnline: boolean;
}

export interface HouseholdInfo {
  id: string;
  name: string;
  maxMembers: number;
}

export type InviteState = {
  code: string;
  expiresInHours: number;
  expired: boolean;
  link: string;
};

export type HouseholdOverviewResponse = {
  household: HouseholdInfo;
  members: HouseholdMember[];
  currentUserId: string;
  invite: InviteState;
};
