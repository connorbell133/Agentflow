/**
 * TypeScript types for tenant-aware database operations
 * These types help enforce tenant isolation at compile time
 */

/**
 * Tables that have an org_id column and require tenant filtering
 */
export interface TenantTable {
  org_id: string;
  [key: string]: unknown;
}

/**
 * Options for tenant-aware queries
 */
export interface TenantQueryOptions {
  /**
   * Whether to include the tenant filter (org_id)
   * @default true
   */
  includeTenantFilter?: boolean;

  /**
   * Additional where conditions to apply
   */
  where?: Record<string, unknown>;
}

/**
 * Result of a tenant-aware find operation
 */
export interface TenantFindResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Result of a tenant-aware list operation
 */
export interface TenantListResult<T> {
  data: T[];
  error: Error | null;
}

/**
 * Pagination options for tenant queries
 */
export interface TenantPaginationOptions extends TenantQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: { column: string; direction: 'asc' | 'desc' }[];
}

/**
 * Filter options for tenant queries
 */
export interface TenantFilterOptions<T = unknown> extends TenantQueryOptions {
  filters?: Partial<T>;
}

/**
 * Type guard to check if a table has org_id (is tenant-aware)
 */
export function isTenantTable(table: unknown): table is TenantTable {
  return table !== null && typeof table === 'object' && 'org_id' in table;
}

/**
 * Extract tenant-safe insert values
 * Ensures org_id is included in insert operations
 */
export type TenantInsertValues<T> = T & {
  org_id: string;
};

/**
 * Extract tenant-safe update values
 * Prevents updating org_id (changing tenant ownership)
 */
export type TenantUpdateValues<T> = Omit<Partial<T>, 'org_id'>;
