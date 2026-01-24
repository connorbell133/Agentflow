/**
 * Database Lock Utilities
 *
 * Provides PostgreSQL advisory locks for preventing race conditions
 * during parallel test execution.
 *
 * Advisory locks are session-level locks that:
 * - Don't require explicit table locks
 * - Are automatically released when connection closes
 * - Support both blocking and non-blocking modes
 * - Are identified by integer keys
 *
 * Usage:
 *   const lock = new AdvisoryLock(supabase, 'user-creation');
 *   await lock.acquire();
 *   try {
 *     // Critical section
 *   } finally {
 *     await lock.release();
 *   }
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseTestClient } from './supabase-test-client';

/**
 * Convert string key to PostgreSQL advisory lock ID
 * Uses a simple hash function to map strings to integers
 */
function stringToLockId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Ensure positive number
  return Math.abs(hash);
}

/**
 * Advisory Lock Manager
 */
export class AdvisoryLock {
  private supabase: SupabaseClient;
  private lockKey: string;
  private lockId: number;
  private acquired: boolean = false;

  constructor(supabase: SupabaseClient | null = null, lockKey: string) {
    this.supabase = supabase || createSupabaseTestClient();
    this.lockKey = lockKey;
    this.lockId = stringToLockId(lockKey);
  }

  /**
   * Acquire lock (blocking - waits until available)
   */
  async acquire(timeout: number = 30000): Promise<boolean> {
    if (this.acquired) {
      console.warn(`Lock "${this.lockKey}" already acquired by this instance`);
      return true;
    }

    const startTime = Date.now();

    try {
      // Try to acquire lock with timeout
      const { data, error } = await this.supabase.rpc('pg_advisory_lock', {
        key: this.lockId,
      });

      if (error) {
        console.error(`Failed to acquire lock "${this.lockKey}":`, error);
        return false;
      }

      this.acquired = true;
      const duration = Date.now() - startTime;
      console.log(`🔒 Acquired lock "${this.lockKey}" (${duration}ms)`);
      return true;
    } catch (error: any) {
      console.error(`Error acquiring lock "${this.lockKey}":`, error.message);
      return false;
    }
  }

  /**
   * Try to acquire lock (non-blocking - returns immediately)
   */
  async tryAcquire(): Promise<boolean> {
    if (this.acquired) {
      return true;
    }

    try {
      const { data, error } = await this.supabase.rpc('pg_try_advisory_lock', {
        key: this.lockId,
      });

      if (error) {
        console.error(`Failed to try acquire lock "${this.lockKey}":`, error);
        return false;
      }

      this.acquired = data === true;
      if (this.acquired) {
        console.log(`🔒 Acquired lock "${this.lockKey}" (non-blocking)`);
      }
      return this.acquired;
    } catch (error: any) {
      console.error(`Error trying to acquire lock "${this.lockKey}":`, error.message);
      return false;
    }
  }

  /**
   * Release lock
   */
  async release(): Promise<boolean> {
    if (!this.acquired) {
      return true;
    }

    try {
      const { data, error } = await this.supabase.rpc('pg_advisory_unlock', {
        key: this.lockId,
      });

      if (error) {
        console.error(`Failed to release lock "${this.lockKey}":`, error);
        return false;
      }

      this.acquired = false;
      console.log(`🔓 Released lock "${this.lockKey}"`);
      return true;
    } catch (error: any) {
      console.error(`Error releasing lock "${this.lockKey}":`, error.message);
      return false;
    }
  }

  /**
   * Check if lock is currently acquired
   */
  isAcquired(): boolean {
    return this.acquired;
  }

  /**
   * Execute function with lock protection
   */
  async withLock<T>(fn: () => Promise<T>, timeout: number = 30000): Promise<T> {
    const acquired = await this.acquire(timeout);
    if (!acquired) {
      throw new Error(`Failed to acquire lock "${this.lockKey}" within ${timeout}ms`);
    }

    try {
      return await fn();
    } finally {
      await this.release();
    }
  }
}

/**
 * Lock Manager for common test operations
 */
export class TestLockManager {
  private supabase: SupabaseClient;
  private locks: Map<string, AdvisoryLock> = new Map();

  constructor(supabase: SupabaseClient | null = null) {
    this.supabase = supabase || createSupabaseTestClient();
  }

  /**
   * Get or create a lock for a specific key
   */
  getLock(key: string): AdvisoryLock {
    if (!this.locks.has(key)) {
      this.locks.set(key, new AdvisoryLock(this.supabase, key));
    }
    return this.locks.get(key)!;
  }

  /**
   * Create a user with lock protection
   */
  async withUserCreationLock<T>(workerId: number, fn: () => Promise<T>): Promise<T> {
    const lock = this.getLock(`user-creation-worker-${workerId}`);
    return await lock.withLock(fn);
  }

  /**
   * Create an organization with lock protection
   */
  async withOrgCreationLock<T>(workerId: number, fn: () => Promise<T>): Promise<T> {
    const lock = this.getLock(`org-creation-worker-${workerId}`);
    return await lock.withLock(fn);
  }

  /**
   * Create a group with lock protection
   */
  async withGroupCreationLock<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
    const lock = this.getLock(`group-creation-${orgId}`);
    return await lock.withLock(fn);
  }

  /**
   * Create a model with lock protection
   */
  async withModelCreationLock<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
    const lock = this.getLock(`model-creation-${orgId}`);
    return await lock.withLock(fn);
  }

  /**
   * Generic operation with lock
   */
  async withLock<T>(lockKey: string, fn: () => Promise<T>, timeout?: number): Promise<T> {
    const lock = this.getLock(lockKey);
    return await lock.withLock(fn, timeout);
  }

  /**
   * Release all locks
   */
  async releaseAll(): Promise<void> {
    const promises = Array.from(this.locks.values()).map(lock => lock.release());
    await Promise.all(promises);
    this.locks.clear();
  }
}

/**
 * Create a scoped lock manager (automatically releases on completion)
 */
export async function withLockManager<T>(
  fn: (manager: TestLockManager) => Promise<T>,
  supabase?: SupabaseClient
): Promise<T> {
  const manager = new TestLockManager(supabase);
  try {
    return await fn(manager);
  } finally {
    await manager.releaseAll();
  }
}

/**
 * Helper: Execute function with simple advisory lock
 */
export async function withAdvisoryLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
  supabase?: SupabaseClient,
  timeout?: number
): Promise<T> {
  const lock = new AdvisoryLock(supabase, lockKey);
  return await lock.withLock(fn, timeout);
}

/**
 * Distributed lock for test fixtures
 * Prevents multiple workers from initializing same resource
 */
export class FixtureLock {
  private lockManager: TestLockManager;

  constructor(supabase?: SupabaseClient) {
    this.lockManager = new TestLockManager(supabase);
  }

  /**
   * Acquire lock for admin user setup
   */
  async acquireAdminSetupLock(workerId: number): Promise<boolean> {
    const lock = this.lockManager.getLock(`admin-setup-worker-${workerId}`);
    return await lock.acquire();
  }

  /**
   * Release admin setup lock
   */
  async releaseAdminSetupLock(workerId: number): Promise<boolean> {
    const lock = this.lockManager.getLock(`admin-setup-worker-${workerId}`);
    return await lock.release();
  }

  /**
   * Execute admin setup with lock
   */
  async withAdminSetupLock<T>(workerId: number, fn: () => Promise<T>): Promise<T> {
    return await this.lockManager.withUserCreationLock(workerId, fn);
  }

  /**
   * Acquire lock for organization setup
   */
  async acquireOrgSetupLock(orgId: string): Promise<boolean> {
    const lock = this.lockManager.getLock(`org-setup-${orgId}`);
    return await lock.acquire();
  }

  /**
   * Release organization setup lock
   */
  async releaseOrgSetupLock(orgId: string): Promise<boolean> {
    const lock = this.lockManager.getLock(`org-setup-${orgId}`);
    return await lock.release();
  }

  /**
   * Execute organization setup with lock
   */
  async withOrgSetupLock<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
    const lock = this.lockManager.getLock(`org-setup-${orgId}`);
    return await lock.withLock(fn);
  }

  /**
   * Release all locks
   */
  async releaseAll(): Promise<void> {
    await this.lockManager.releaseAll();
  }
}

/**
 * Retry helper with exponential backoff
 * Useful when locks fail to acquire
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 100
): Promise<T> {
  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.log(`  Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  throw lastError || new Error('Retry failed');
}
