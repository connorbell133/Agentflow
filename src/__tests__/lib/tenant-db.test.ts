/**
 * Unit tests for tenant-aware database helpers
 */

import {
  getTenantContext,
  getOrgTenantContext,
  tryGetTenantContext,
  hasOrgAccess,
  assertOrgAccess,
} from '@/lib/db/tenant-context';
import { TenantContextError } from '@/lib/db/tenant-errors';
import { auth } from '@/lib/auth/server';

// Mock Better-Auth
jest.mock('@/lib/auth/server', () => ({
  auth: jest.fn(),
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('getTenantContext', () => {
  it('should return tenant context when user is authenticated', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-123',
      org_id: 'org-456',
      user: {
        id: 'user-123',
        user_metadata: { org_id: 'org-456' },
      },
    } as any);

    const context = await getTenantContext();

    expect(context).toEqual({
      userId: 'user-123',
      org_id: 'org-456',
    });
  });

  it('should throw TenantContextError when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      org_id: null,
      user: null,
    } as any);

    await expect(getTenantContext()).rejects.toThrow(TenantContextError);
    await expect(getTenantContext()).rejects.toThrow('User must be authenticated');
  });

  it('should allow null org_id for users not in an organization', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-123',
      org_id: null,
      user: {
        id: 'user-123',
        user_metadata: {},
      },
    } as any);

    const context = await getTenantContext();

    expect(context.userId).toBe('user-123');
    expect(context.org_id).toBeNull();
  });
});

describe('getOrgTenantContext', () => {
  it('should return context when user is in an organization', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-123',
      org_id: 'org-456',
      user: {
        id: 'user-123',
        user_metadata: { org_id: 'org-456' },
      },
    } as any);

    const context = await getOrgTenantContext();

    expect(context).toEqual({
      userId: 'user-123',
      org_id: 'org-456',
    });
  });

  it('should throw error when user is not in an organization', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-123',
      org_id: null,
      user: {
        id: 'user-123',
        user_metadata: {},
      },
    } as any);

    await expect(getOrgTenantContext()).rejects.toThrow(TenantContextError);
    await expect(getOrgTenantContext()).rejects.toThrow('must be part of an organization');
  });

  it('should throw error when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      org_id: null,
      user: null,
    } as any);

    await expect(getOrgTenantContext()).rejects.toThrow(TenantContextError);
  });
});

describe('tryGetTenantContext', () => {
  it('should return context when authenticated', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-123',
      org_id: 'org-456',
      user: {
        id: 'user-123',
        user_metadata: { org_id: 'org-456' },
      },
    } as any);

    const context = await tryGetTenantContext();

    expect(context).toEqual({
      userId: 'user-123',
      org_id: 'org-456',
    });
  });

  it('should return null when not authenticated', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      org_id: null,
      user: null,
    } as any);

    const context = await tryGetTenantContext();

    expect(context).toBeNull();
  });

  it('should rethrow non-TenantContextError errors', async () => {
    mockAuth.mockRejectedValue(new Error('Database connection failed'));

    await expect(tryGetTenantContext()).rejects.toThrow('Database connection failed');
  });
});

describe('hasOrgAccess', () => {
  it('should return true when user is in the target organization', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-123',
      org_id: 'org-456',
      user: {
        id: 'user-123',
        user_metadata: { org_id: 'org-456' },
      },
    } as any);

    const hasAccess = await hasOrgAccess('org-456');

    expect(hasAccess).toBe(true);
  });

  it('should return false when user is in a different organization', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-123',
      org_id: 'org-456',
      user: {
        id: 'user-123',
        user_metadata: { org_id: 'org-456' },
      },
    } as any);

    const hasAccess = await hasOrgAccess('org-999');

    expect(hasAccess).toBe(false);
  });

  it('should return false when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      org_id: null,
      user: null,
    } as any);

    const hasAccess = await hasOrgAccess('org-456');

    expect(hasAccess).toBe(false);
  });

  it('should return false when user is not in any organization', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-123',
      org_id: null,
      user: {
        id: 'user-123',
        user_metadata: {},
      },
    } as any);

    const hasAccess = await hasOrgAccess('org-456');

    expect(hasAccess).toBe(false);
  });
});

describe('assertOrgAccess', () => {
  it('should not throw when user has access', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-123',
      org_id: 'org-456',
      user: {
        id: 'user-123',
        user_metadata: { org_id: 'org-456' },
      },
    } as any);

    await expect(assertOrgAccess('org-456')).resolves.not.toThrow();
  });

  it('should throw when user does not have access', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-123',
      org_id: 'org-456',
      user: {
        id: 'user-123',
        user_metadata: { org_id: 'org-456' },
      },
    } as any);

    await expect(assertOrgAccess('org-999')).rejects.toThrow(TenantContextError);
    await expect(assertOrgAccess('org-999')).rejects.toThrow(
      'does not have access to organization'
    );
  });

  it('should throw when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      org_id: null,
      user: null,
    } as any);

    await expect(assertOrgAccess('org-456')).rejects.toThrow(TenantContextError);
  });
});

describe('Error Types', () => {
  it('should create TenantContextError with correct properties', () => {
    const error = new TenantContextError('Test error message');

    expect(error.name).toBe('TenantContextError');
    expect(error.message).toBe('Test error message');
    expect(error.code).toBe('TENANT_CONTEXT_MISSING');
    expect(error.statusCode).toBe(401);
  });

  it('should use default message when none provided', () => {
    const error = new TenantContextError();

    expect(error.message).toBe('Tenant context not found. User must be authenticated.');
  });
});

describe('Security Edge Cases', () => {
  it('should handle undefined userId gracefully', async () => {
    mockAuth.mockResolvedValue({
      userId: undefined,
      org_id: 'org-456',
      user: {
        id: undefined,
        user_metadata: { org_id: 'org-456' },
      },
    } as any);

    await expect(getTenantContext()).rejects.toThrow(TenantContextError);
  });

  it('should handle empty string userId as invalid', async () => {
    mockAuth.mockResolvedValue({
      userId: '',
      org_id: 'org-456',
      user: {
        id: '',
        user_metadata: { org_id: 'org-456' },
      },
    } as any);

    await expect(getTenantContext()).rejects.toThrow(TenantContextError);
  });

  it('should allow users without org_id', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user-123',
      org_id: null,
      user: {
        id: 'user-123',
        user_metadata: {},
      },
    } as any);

    const context = await getTenantContext();

    expect(context.userId).toBe('user-123');
    expect(context.org_id).toBeNull();
  });
});
