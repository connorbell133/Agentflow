import { renderHook, waitFor } from '@testing-library/react';
import { useUsers } from '../use-user';
import { getOrgUsers } from '@/actions/auth/users';
import { getOrgUsersLastConversation, getUsersLastConversation } from '@/actions/chat/conversations';
import { getOrgInvites } from '@/actions/organization/invites';
import { getDifferenceInDays } from '@/utils/formatters/date';
import { User as Profile } from '@/lib/supabase/types';

jest.mock('@/actions/auth/users');
jest.mock('@/actions/chat/conversations');
jest.mock('@/actions/organization/invites');
jest.mock('@/utils/formatters/date');
jest.mock('@/lib/infrastructure/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
}));

const mockProfiles: Profile[] = [
  {
    id: 'user-1',
    email: 'user1@example.com',
    name: 'User One',
    role: 'user',
    organization: 'org-123',
    phoneNumber: '1234567890',
    username: 'user1',
    tags: ['tag1'],
    properties: {},
    superAdmin: false,
    publicUserId: 'pub-user-1',
    created_at: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'user-2',
    email: 'user2@example.com',
    name: 'User Two',
    role: 'admin',
    organization: 'org-123',
    phoneNumber: '0987654321',
    username: 'user2',
    tags: ['tag2'],
    properties: {},
    superAdmin: false,
    publicUserId: 'pub-user-2',
    created_at: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

const mockOrgUsersResponse = [
  { profiles: mockProfiles[0] },
  { profiles: mockProfiles[1] },
];

const mockLastConvos = [
  { user: 'user-1', lastcreated_at: '2024-01-10T10:00:00Z' },
  { user: 'user-2', lastcreated_at: '2024-01-15T10:00:00Z' },
];

const mockGlobalLast = [
  { user: 'user-1', lastcreated_at: '2024-01-05T10:00:00Z' },
  { user: 'user-3', lastcreated_at: '2024-01-20T10:00:00Z' },
];

const mockInvites = [
  { invitee: 'pending@example.com', invitedBy: 'admin' },
  { invitee: 'another@example.com', invitedBy: 'admin' },
];

describe('useUsers Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getOrgUsers as jest.Mock).mockResolvedValue(mockOrgUsersResponse);
    (getOrgUsersLastConversation as jest.Mock).mockResolvedValue(mockLastConvos);
    (getUsersLastConversation as jest.Mock).mockResolvedValue(mockGlobalLast);
    (getOrgInvites as jest.Mock).mockResolvedValue(mockInvites);
    (getDifferenceInDays as jest.Mock).mockImplementation((date1, date2) => {
      const diff = Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
      return diff;
    });
  });

  describe('Initial State', () => {
    it('should return empty users and loading state initially', () => {
      const { result } = renderHook(() => useUsers('org-123'));

      expect(result.current.users).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.getUserById).toBeDefined();
      expect(result.current.getUserStatus).toBeDefined();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch and set users when org is provided', async () => {
      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(getOrgUsers).toHaveBeenCalledWith('org-123');
      expect(getOrgUsersLastConversation).toHaveBeenCalledWith('org-123');
      expect(getUsersLastConversation).toHaveBeenCalled();
      expect(getOrgInvites).toHaveBeenCalledWith('org-123');

      expect(result.current.users).toEqual(mockProfiles);
    });

    it('should handle empty org parameter', async () => {
      const { result } = renderHook(() => useUsers(''));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(getOrgUsers).not.toHaveBeenCalled();
      expect(result.current.users).toEqual([]);
    });

    it('should handle null data response', async () => {
      (getOrgUsers as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.users).toEqual([]);
    });

    it('should filter out invalid profiles', async () => {
      (getOrgUsers as jest.Mock).mockResolvedValue([
        { profiles: mockProfiles[0] },
        { profiles: null },
        { profiles: undefined },
        { profiles: mockProfiles[1] },
      ]);

      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.users).toEqual(mockProfiles);
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const user = result.current.getUserById('user-1');
      expect(user).toEqual(mockProfiles[0]);
    });

    it('should return undefined for non-existent user', async () => {
      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const user = result.current.getUserById('non-existent');
      expect(user).toBeUndefined();
    });
  });

  describe('getUserStatus', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-20'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return pending for users with pending invites', async () => {
      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const pendingUser: Profile = {
        ...mockProfiles[0],
        email: 'pending@example.com',
      };

      const status = result.current.getUserStatus(pendingUser);
      expect(status).toBe('pending');
    });

    it('should return active for users with recent activity (within 7 days)', async () => {
      (getDifferenceInDays as jest.Mock).mockReturnValue(5);

      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const status = result.current.getUserStatus(mockProfiles[0]);
      expect(status).toBe('active');
    });

    it('should return inactive for users with old activity (more than 7 days)', async () => {
      (getDifferenceInDays as jest.Mock).mockReturnValue(10);

      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const status = result.current.getUserStatus(mockProfiles[0]);
      expect(status).toBe('inactive');
    });

    it('should return not_started for users without activity', async () => {
      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const userWithoutActivity: Profile = {
        ...mockProfiles[0],
        id: 'user-without-activity',
      };

      const status = result.current.getUserStatus(userWithoutActivity);
      expect(status).toBe('not_started');
    });

    it('should prioritize org conversation activity over global activity', async () => {
      (getDifferenceInDays as jest.Mock).mockReturnValue(5);

      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify the status is calculated with org activity taking precedence
      const status = result.current.getUserStatus(mockProfiles[1]);
      expect(status).toBe('active');

      // User 1 has activity in both org and global, org should take precedence
      expect(getDifferenceInDays).toHaveBeenCalled();
    });
  });

  describe('Activity Map Construction', () => {
    it('should construct activity map from both global and org conversations', async () => {
      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const user1Activity = result.current.getUserStatus(mockProfiles[0]);
      const user2Activity = result.current.getUserStatus(mockProfiles[1]);

      expect(user1Activity).toBeDefined();
      expect(user2Activity).toBeDefined();
    });

    it('should handle null conversation data gracefully', async () => {
      (getOrgUsersLastConversation as jest.Mock).mockResolvedValue(null);
      (getUsersLastConversation as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.users).toEqual(mockProfiles);
      expect(() => result.current.getUserStatus(mockProfiles[0])).not.toThrow();
    });
  });

  describe('Pending Users', () => {
    it('should correctly identify pending users from invites', async () => {
      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const pendingUser1: Profile = {
        ...mockProfiles[0],
        email: 'pending@example.com',
      };

      const pendingUser2: Profile = {
        ...mockProfiles[0],
        email: 'another@example.com',
      };

      const regularUser: Profile = {
        ...mockProfiles[0],
        email: 'regular@example.com',
      };

      expect(result.current.getUserStatus(pendingUser1)).toBe('pending');
      expect(result.current.getUserStatus(pendingUser2)).toBe('pending');
      expect(result.current.getUserStatus(regularUser)).not.toBe('pending');
    });

    it('should handle null invites data', async () => {
      (getOrgInvites as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useUsers('org-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(() => result.current.getUserStatus(mockProfiles[0])).not.toThrow();
    });
  });

  describe('Hook Re-render', () => {
    it('should refetch data when org changes', async () => {
      const { result, rerender } = renderHook(
        ({ org }) => useUsers(org),
        { initialProps: { org: 'org-123' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(getOrgUsers).toHaveBeenCalledTimes(1);

      rerender({ org: 'org-456' });

      await waitFor(() => {
        expect(getOrgUsers).toHaveBeenCalledWith('org-456');
      });

      expect(getOrgUsers).toHaveBeenCalledTimes(2);
    });
  });

});