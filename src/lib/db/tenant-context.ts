/**
 * Centralized tenant context management
 * Provides a single source of truth for user authentication and organization context
 */

import { auth } from '@clerk/nextjs/server';
import { TenantContextError } from './tenant-errors';

/**
 * Tenant context containing authenticated user and organization information
 */
export interface TenantContext {
  userId: string;
  org_id: string | null;
  sessionId: string | null;
}

/**
 * Get the current tenant context from Clerk authentication
 * This is the single source of truth for tenant isolation
 *
 * @throws {TenantContextError} If user is not authenticated
 * @returns {TenantContext} Current user's tenant context
 */
export async function getTenantContext(): Promise<TenantContext> {
  const authResult = await auth();
  const { userId, sessionId, orgId } = authResult;

  if (!userId) {
    throw new TenantContextError('User must be authenticated to access this resource');
  }

  // If Clerk doesn't provide an org_id, try to get it from the database
  let finalorg_id = orgId || null;

  if (!finalorg_id) {
    // Dynamically import to avoid circular dependencies
    const { getUserOrganization } = await import('@/actions/organization/getUserOrg');
    const orgResult = await getUserOrganization(userId);

    if (orgResult.data) {
      finalorg_id = orgResult.data;
    }
  }

  return {
    userId,
    org_id: finalorg_id,
    sessionId: sessionId || null,
  };
}

/**
 * Get tenant context with required organization
 * Use this when the operation requires the user to be part of an organization
 *
 * @throws {TenantContextError} If user is not authenticated or not in an organization
 * @returns {Required<TenantContext>} Tenant context with guaranteed org_id
 */
export async function getOrgTenantContext(): Promise<Required<Omit<TenantContext, 'sessionId'>> & { sessionId: string | null }> {
  const context = await getTenantContext();

  if (!context.org_id) {
    throw new TenantContextError('User must be part of an organization to access this resource. Please ensure you are assigned to an organization.');
  }

  return {
    userId: context.userId,
    org_id: context.org_id,
    sessionId: context.sessionId,
  };
}

/**
 * Attempt to get tenant context, returns null if not authenticated
 * Use this for optional authentication scenarios
 *
 * @returns {TenantContext | null} Current tenant context or null if not authenticated
 */
export async function tryGetTenantContext(): Promise<TenantContext | null> {
  try {
    return await getTenantContext();
  } catch (error) {
    if (error instanceof TenantContextError) {
      return null;
    }
    throw error;
  }
}

/**
 * Check if a user has access to a specific organization
 * This is a basic check - for complex permission logic, use proper RBAC
 *
 * @param targetorg_id - The organization ID to check access for
 * @returns {boolean} True if user has access to the organization
 */
export async function hasOrgAccess(targetorg_id: string): Promise<boolean> {
  const context = await tryGetTenantContext();

  if (!context) {
    return false;
  }

  return context.org_id === targetorg_id;
}

/**
 * Assert that the current user has access to the specified organization
 *
 * @param targetorg_id - The organization ID to check access for
 * @throws {TenantContextError} If user doesn't have access
 */
export async function assertOrgAccess(targetorg_id: string): Promise<void> {
  const context = await getTenantContext();

  if (context.org_id !== targetorg_id) {
    throw new TenantContextError(
      `Access denied: User does not have access to organization ${targetorg_id}`
    );
  }
}
