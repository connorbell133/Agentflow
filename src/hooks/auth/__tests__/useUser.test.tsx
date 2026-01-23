import { renderHook, waitFor } from '@testing-library/react';
import { useSession } from '@/lib/auth/client-helpers';
import { useUser } from '../use-user';
import { getUserProfile, getUserGroups } from '@/actions/auth/users';
import { User as Profile } from '@/lib/supabase/types';

jest.mock('@/lib/auth/client-helpers');
jest.mock('@/actions/auth/users');
jest.mock('@/lib/infrastructure/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
}));

const mockBetterAuthUser = {
  id: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
};

const mockProfile: Profile = {
  id: 'user-123',
  email: 'john@example.com',
  name: 'John Doe',
  role: 'user',
  organization: 'org-123',
  phoneNumber: '1234567890',
  username: 'johndoe',
  tags: ['tag1'],
  properties: {},
  superAdmin: false,
  publicUserId: 'pub-user-123',
  created_at: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockAdminGroups = [
  { groups: { role: 'admin', name: 'Admin Group' } },
  { groups: { role: 'user', name: 'User Group' } },
];

const mockUserGroups = [{ groups: { role: 'user', name: 'User Group' } }];

describe('useUser Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockBetterAuthUser },
      isPending: false,
    });
    (getUserProfile as jest.Mock).mockResolvedValue([mockProfile]);
    (getUserGroups as jest.Mock).mockResolvedValue(mockUserGroups);
  });

  describe('Initial State', () => {
    it('should return initial state when session is loading', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        isPending: true,
      });

      const { result } = renderHook(() => useUser());

      expect(result.current.user).toBeUndefined();
      expect(result.current.profile).toBeNull();
      expect(result.current.userAdmin).toBe(false);
      expect(result.current.isUserLoaded).toBe(false);
    });
  });

  describe('User Data Fetching', () => {
    it('should fetch user profile and groups when Better-Auth user is loaded', async () => {
      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      expect(getUserProfile).toHaveBeenCalledWith('user-123');
      expect(getUserGroups).toHaveBeenCalledWith('user-123');
      expect(result.current.user).toEqual(mockBetterAuthUser);
      expect(result.current.userAdmin).toBe(false);
      expect(result.current.isUserLoaded).toBe(true);
    });

    it('should not fetch data when no user exists', async () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        isPending: false,
      });

      renderHook(() => useUser());

      await waitFor(() => {
        expect(getUserProfile).not.toHaveBeenCalled();
      });

      expect(getUserGroups).not.toHaveBeenCalled();
    });

    it('should handle null user profile response', async () => {
      (getUserProfile as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(getUserGroups).toHaveBeenCalled();
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.userAdmin).toBe(false);
    });

    it('should handle empty user profile array', async () => {
      (getUserProfile as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(getUserGroups).toHaveBeenCalled();
      });

      expect(result.current.profile).toBeUndefined();
    });
  });

  describe('Admin Status Detection', () => {
    it('should set userAdmin to true when user has admin role', async () => {
      (getUserGroups as jest.Mock).mockResolvedValue(mockAdminGroups);

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.userAdmin).toBe(true);
      });
    });

    it('should set userAdmin to false when user has only non-admin roles', async () => {
      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.userAdmin).toBe(false);
      });
    });

    it('should handle null groups data', async () => {
      (getUserGroups as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      expect(result.current.userAdmin).toBe(false);
    });

    it('should handle empty groups array', async () => {
      (getUserGroups as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      expect(result.current.userAdmin).toBe(false);
    });

    it('should filter out null group roles', async () => {
      (getUserGroups as jest.Mock).mockResolvedValue([
        { groups: { role: 'user' } },
        { groups: { role: null } },
        { groups: null },
        { groups: { role: 'admin' } },
      ]);

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.userAdmin).toBe(true);
      });
    });
  });

  describe('Hook Re-render', () => {
    it('should refetch data when user changes', async () => {
      const { result, rerender } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      expect(getUserProfile).toHaveBeenCalledTimes(1);

      // Change the user
      const newUser = { ...mockBetterAuthUser, id: 'user-456' };
      (useSession as jest.Mock).mockReturnValue({
        data: { user: newUser },
        isPending: false,
      });

      rerender();

      await waitFor(() => {
        expect(getUserProfile).toHaveBeenCalledWith('user-456');
      });

      expect(getUserProfile).toHaveBeenCalledTimes(2);
    });

    it('should not fetch when session is pending', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: { user: mockBetterAuthUser },
        isPending: true,
      });

      renderHook(() => useUser());

      expect(getUserProfile).not.toHaveBeenCalled();
      expect(getUserGroups).not.toHaveBeenCalled();
    });

    it('should fetch when isPending changes to false', async () => {
      // Initially pending
      (useSession as jest.Mock).mockReturnValue({
        data: { user: mockBetterAuthUser },
        isPending: true,
      });

      const { rerender } = renderHook(() => useUser());

      expect(getUserProfile).not.toHaveBeenCalled();

      // Now loaded
      (useSession as jest.Mock).mockReturnValue({
        data: { user: mockBetterAuthUser },
        isPending: false,
      });

      rerender();

      await waitFor(() => {
        expect(getUserProfile).toHaveBeenCalledWith('user-123');
      });
    });
  });

  describe('Type Casting', () => {
    it('should cast profile and userAdmin to their respective types', async () => {
      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      // Check that the values are properly typed (not null)
      expect(typeof result.current.userAdmin).toBe('boolean');
      expect(result.current.profile).toBeDefined();
    });

    it('should handle type casting when data is null', async () => {
      (getUserProfile as jest.Mock).mockResolvedValue(null);
      (getUserGroups as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(getUserGroups).toHaveBeenCalled();
      });

      // Even when null, types should be cast
      expect(result.current.profile).toBeNull();
      expect(result.current.userAdmin).toBe(false);
    });
  });

  describe('Complex Group Scenarios', () => {
    it('should handle multiple admin roles correctly', async () => {
      (getUserGroups as jest.Mock).mockResolvedValue([
        { groups: { role: 'admin' } },
        { groups: { role: 'admin' } },
        { groups: { role: 'user' } },
      ]);

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.userAdmin).toBe(true);
      });
    });

    it('should handle mixed valid and invalid group data', async () => {
      (getUserGroups as jest.Mock).mockResolvedValue([
        { groups: { role: 'user' } },
        { notGroups: { role: 'admin' } },
        { groups: { role: 'moderator' } },
        { groups: null },
      ]);

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.userAdmin).toBe(false);
      });
    });
  });
});
