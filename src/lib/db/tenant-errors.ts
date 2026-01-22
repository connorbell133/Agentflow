/**
 * Custom error classes for tenant isolation violations
 * These errors help identify and debug multi-tenant security issues
 */

/**
 * Base error for all tenant-related violations
 */
export class TenantError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'TenantError';
  }
}

/**
 * Thrown when tenant context (userId/org_id) is missing or invalid
 */
export class TenantContextError extends TenantError {
  constructor(message: string = 'Tenant context not found. User must be authenticated.') {
    super(message, 'TENANT_CONTEXT_MISSING', 401);
    this.name = 'TenantContextError';
  }
}

/**
 * Thrown when a user attempts to access resources from another organization
 */
export class TenantAccessViolation extends TenantError {
  constructor(
    public resourceType: string,
    public resourceId: string,
    public attemptedByUserId: string,
    public attemptedorg_id: string
  ) {
    super(
      `Access denied: User ${attemptedByUserId} in org ${attemptedorg_id} cannot access ${resourceType}:${resourceId}`,
      'TENANT_ACCESS_VIOLATION',
      403
    );
    this.name = 'TenantAccessViolation';
  }
}

/**
 * Thrown when a resource doesn't exist or user doesn't have permission to know it exists
 * (prevents information disclosure)
 */
export class TenantResourceNotFound extends TenantError {
  constructor(
    public resourceType: string,
    public resourceId: string
  ) {
    super(
      `${resourceType} not found`,
      'TENANT_RESOURCE_NOT_FOUND',
      404
    );
    this.name = 'TenantResourceNotFound';
  }
}

/**
 * Helper to log tenant violations for security monitoring
 */
export function logTenantViolation(error: TenantError, context?: Record<string, any>) {
  // In production, this should integrate with your security monitoring service
  // (e.g., Sentry, DataDog, CloudWatch)
  console.error('[TENANT VIOLATION]', {
    error: error.message,
    code: error.code,
    name: error.name,
    ...context,
    timestamp: new Date().toISOString(),
  });
}
