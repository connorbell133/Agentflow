import { ensureProfileExists, syncProfileFromClerk } from '@/actions/auth/profile-sync';
import { db } from '@/db/connection';
import { profiles } from '@/db/schema';

// Mock the database
jest.mock('@/db/connection', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock the logger
jest.mock('@/lib/infrastructure/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('Profile Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureProfileExists', () => {
    it('should return existing profile if found', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        avatarUrl: null,
        signupComplete: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Mock the select query
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockProfile]),
          }),
        }),
      } as any);

      const result = await ensureProfileExists({
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
      });

      expect(result).toEqual({
        success: true,
        data: mockProfile,
        created: false,
      });
    });

    it('should create new profile if not found', async () => {
      const newProfile = {
        id: 'user-456',
        email: 'new@example.com',
        fullName: 'New User',
        avatarUrl: null,
        signupComplete: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Mock no existing profile
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      // Mock successful insert
      (db.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([newProfile]),
          }),
        }),
      } as any);

      const result = await ensureProfileExists({
        id: 'user-456',
        email: 'new@example.com',
        fullName: 'New User',
      });

      expect(result).toEqual({
        success: true,
        data: newProfile,
        created: true,
      });
    });

    it('should retry on failure', async () => {
      // Mock select to always return empty
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      // Mock insert to fail twice then succeed
      let callCount = 0;
      (db.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockImplementation(() => {
              callCount++;
              if (callCount < 3) {
                return Promise.reject(new Error('Database error'));
              }
              return Promise.resolve([{
                id: 'user-789',
                email: 'retry@example.com',
                fullName: 'Retry User',
              }]);
            }),
          }),
        }),
      } as any);

      const result = await ensureProfileExists({
        id: 'user-789',
        email: 'retry@example.com',
        fullName: 'Retry User',
      });

      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
    });

    it('should return error after max retries', async () => {
      // Mock select to always return empty
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      // Mock insert to always fail
      (db.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockRejectedValue(new Error('Persistent error')),
          }),
        }),
      } as any);

      const result = await ensureProfileExists({
        id: 'user-fail',
        email: 'fail@example.com',
        fullName: 'Fail User',
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to create profile after multiple attempts',
        details: expect.any(Error),
      });
    });
  });

  describe('syncProfileFromClerk', () => {
    it('should sync profile with proper formatting', async () => {
      // Mock successful profile creation
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      (db.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 'clerk-user',
              email: 'clerk@example.com',
              fullName: 'John Doe',
              avatarUrl: 'https://example.com/avatar.jpg',
            }]),
          }),
        }),
      } as any);

      const result = await syncProfileFromClerk('clerk-user', {
        email: 'clerk@example.com',
        firstName: 'John',
        lastName: 'Doe',
        imageUrl: 'https://example.com/avatar.jpg',
      });

      expect(result.success).toBe(true);
      expect(result.data?.fullName).toBe('John Doe');
    });

    it('should handle missing name gracefully', async () => {
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      (db.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 'noname-user',
              email: 'noname@example.com',
              fullName: 'User',
            }]),
          }),
        }),
      } as any);

      const result = await syncProfileFromClerk('noname-user', {
        email: 'noname@example.com',
        firstName: null,
        lastName: null,
        imageUrl: null,
      });

      expect(result.success).toBe(true);
      expect(result.data?.fullName).toBe('User');
    });
  });
});