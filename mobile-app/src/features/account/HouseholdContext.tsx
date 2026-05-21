import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { HouseholdInfo, HouseholdMember, HouseholdRole } from './types';
import { householdApi, InviteState } from './api';
import { useAppSelector } from '@/store/hooks';
import { selectIsGuestUser } from '@/store/householdSlice';
import type { RootState } from '@/store';

interface HouseholdContextValue {
  household: HouseholdInfo;
  members: HouseholdMember[];
  currentUserId: string;
  invite: InviteState;
  currentUserRole: HouseholdRole;
  isGuest: boolean;
  canManageMembers: boolean;
  refreshOverview: () => Promise<void>;
  regenerateInvite: () => void;
  transferOwnership: (memberId: string) => void;
  removeMember: (memberId: string) => void;
  leaveHousehold: () => void;
}

const defaultHousehold: HouseholdInfo = {
  id: 'household-01',
  name: 'Bếp nhà Tùng',
  maxMembers: 6,
};

const defaultMembers: HouseholdMember[] = [
  {
    id: '1',
    name: 'Tùng',
    email: 'tung.chef@family.com',
    role: 'OWNER',
    joinedAt: '10/10/2025',
    isOnline: true,
  },
  {
    id: '2',
    name: 'Bố Tèo',
    email: 'boteo82@gmail.com',
    role: 'MEMBER',
    joinedAt: '12/10/2025',
    isOnline: true,
  },
  {
    id: '3',
    name: 'Mẹ Cám',
    email: 'mecam@gmail.com',
    role: 'MEMBER',
    joinedAt: '12/10/2025',
    isOnline: false,
  },
  {
    id: '4',
    name: 'Minh Anh',
    email: 'minhanh@gmail.com',
    role: 'MEMBER',
    joinedAt: '15/10/2025',
    isOnline: false,
  },
];

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

const makeInvite = (): InviteState => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return {
    code: `${code.slice(0, 3)} ${code.slice(3, 6)}`,
    expiresInHours: 24,
    expired: false,
    link: `https://fridge.app/invite/${code}`,
  };
};

const isSameInvite = (left: InviteState, right: InviteState): boolean => {
  return (
    left.code === right.code
    && left.expiresInHours === right.expiresInHours
    && left.expired === right.expired
    && left.link === right.link
  );
};

const isSameHousehold = (left: HouseholdInfo, right: HouseholdInfo): boolean => {
  return left.id === right.id && left.name === right.name && left.maxMembers === right.maxMembers;
};

const isSameMembers = (left: HouseholdMember[], right: HouseholdMember[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i += 1) {
    const leftMember = left[i];
    const rightMember = right[i];
    if (
      leftMember.id !== rightMember.id
      || leftMember.name !== rightMember.name
      || leftMember.email !== rightMember.email
      || leftMember.role !== rightMember.role
      || leftMember.joinedAt !== rightMember.joinedAt
      || leftMember.isOnline !== rightMember.isOnline
    ) {
      return false;
    }
  }

  return true;
};

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [household, setHousehold] = useState(defaultHousehold);
  const [members, setMembers] = useState<HouseholdMember[]>(defaultMembers);
  const [currentUserId, setCurrentUserId] = useState('1');
  const [invite, setInvite] = useState<InviteState>(makeInvite());
  const [lastSyncTime, setLastSyncTime] = useState(0);

  const syncOverview = useCallback(async () => {
    const now = Date.now();
    if (now - lastSyncTime < 30000) { // 30s debounce
      console.log('[HouseholdContext] Sync debounced, skipping...');
      return;
    }

    try {
      const response = await householdApi.getOverview();
      // Validate response before updating state
      if (response?.household && Array.isArray(response.members)) {
        setHousehold((previous) => isSameHousehold(previous, response.household) ? previous : response.household);
        setMembers((previous) => isSameMembers(previous, response.members) ? previous : response.members);
        setCurrentUserId((previous) => response.currentUserId || previous);
        setInvite((previous) => {
          const nextInvite = response.invite || previous;
          return isSameInvite(previous, nextInvite) ? previous : nextInvite;
        });
        setLastSyncTime(now); // Update timestamp only on success
      } else {
        console.warn('[HouseholdContext] Invalid API response format', response);
      }
    } catch (error) {
      console.warn('[HouseholdContext] Failed to sync household overview', error);
      // Don't update timestamp on error to allow retry
    }
  }, [currentUserId, invite, lastSyncTime]);

  useEffect(() => {
    syncOverview();
  }, [syncOverview]);

  const isGuestUserRedux = useAppSelector((state: RootState) => selectIsGuestUser(state));
  const currentUserRole: HouseholdRole = useMemo(
    () => {
      // Safely handle undefined members
      if (!Array.isArray(members)) {
        console.warn('[HouseholdContext] members is not an array:', members);
        return 'MEMBER';
      }
      return members.find((member) => member.id === currentUserId)?.role ?? 'MEMBER';
    },
    [members, currentUserId]
  );

  const isGuest = currentUserRole !== 'OWNER' || isGuestUserRedux;

  const canManageMembers = currentUserRole === 'OWNER';

const regenerateInvite = useCallback(() => {
    if (!canManageMembers) {
      console.warn('[HouseholdContext] Guest cannot regenerate invite');
      return;
    }
    const optimisticInvite = makeInvite();
    setInvite(optimisticInvite);

    householdApi
      .regenerateInvite()
      .then((nextInvite) => {
        setInvite(nextInvite);
      })
      .catch((error) => {
        console.warn('[HouseholdContext] Failed to regenerate invite', error);
        syncOverview();
      });
  }, [syncOverview, canManageMembers]);

  const transferOwnership = useCallback(
    (memberId: string) => {
      if (memberId === currentUserId) {
        return;
      }

      const previousMembers = members;
      const previousCurrentUserId = currentUserId;

      setMembers((prev) =>
        prev.map((member) => {
          if (member.id === memberId) {
            return { ...member, role: 'OWNER' };
          }
          if (member.id === currentUserId) {
            return { ...member, role: 'MEMBER' };
          }
          return member;
        })
      );

      setCurrentUserId(memberId);

      householdApi.transferOwnership(memberId).catch((error) => {
        console.warn('[HouseholdContext] Failed to transfer ownership', error);
        setMembers(previousMembers);
        setCurrentUserId(previousCurrentUserId);
        syncOverview();
      });
    },
    [currentUserId, members, syncOverview]
  );

  const removeMember = useCallback(
    (memberId: string) => {
      const previousMembers = members;
      setMembers((prev) => prev.filter((member) => member.id !== memberId));
      if (memberId === currentUserId) {
        const nextOwner = members.find((member) => member.id !== memberId);
        if (nextOwner) {
          setCurrentUserId(nextOwner.id);
        }
      }

      householdApi.removeMember(memberId).catch((error) => {
        console.warn('[HouseholdContext] Failed to remove member', error);
        setMembers(previousMembers);
        syncOverview();
      });
    },
    [members, currentUserId, syncOverview]
  );

  const leaveHousehold = useCallback(() => {
    setMembers((prev) => prev.filter((member) => member.id !== currentUserId));
    householdApi.leaveHousehold().catch((error) => {
      console.warn('[HouseholdContext] Failed to leave household', error);
      syncOverview();
    });
  }, [currentUserId, syncOverview]);

  const value = useMemo(
    () => ({
      household,
      members,
      currentUserId,
      invite,
      currentUserRole,
      isGuest,
      canManageMembers,
      refreshOverview: syncOverview,
      regenerateInvite,
      transferOwnership,
      removeMember,
      leaveHousehold,
    }),
    [
      household,
      members,
      currentUserId,
      invite,
      currentUserRole,
      canManageMembers,
      syncOverview,
      regenerateInvite,
      transferOwnership,
      removeMember,
      leaveHousehold,
    ]
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
};

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used inside HouseholdProvider');
  }
  return context;
};
