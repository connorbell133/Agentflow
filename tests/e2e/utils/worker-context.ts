/**
 * Worker Context Manager
 *
 * Provides worker-scoped isolation for parallel test execution.
 * Ensures unique identifiers across all parallel workers with zero collision risk.
 *
 * Usage:
 *   const ctx = WorkerContext.create(workerInfo);
 *   const email = ctx.generateEmail('test-user');
 *   // Result: w1-0-test-user@example.com (worker 1, test index 0)
 */

import type { TestInfo } from '@playwright/test';
import { randomUUID } from 'crypto';

export interface WorkerContextOptions {
  workerId: number;
  workerIndex: number;
  projectName?: string;
}

export interface ResourceIdentifier {
  workerId: number;
  testIndex: number;
  resourceType: string;
  resourceName: string;
  fullIdentifier: string;
}

export class WorkerContext {
  private workerId: number;
  private workerIndex: number;
  private projectName: string;
  private testIndex: number = 0;
  private createdResources: ResourceIdentifier[] = [];

  private constructor(options: WorkerContextOptions) {
    this.workerId = options.workerId;
    this.workerIndex = options.workerIndex;
    this.projectName = options.projectName || 'chromium';
  }

  /**
   * Create a WorkerContext from Playwright TestInfo
   */
  static create(testInfo: TestInfo): WorkerContext {
    return new WorkerContext({
      workerId: testInfo.parallelIndex,
      workerIndex: testInfo.workerIndex,
      projectName: testInfo.project.name,
    });
  }

  /**
   * Create a WorkerContext manually (for utilities)
   */
  static createManual(workerId: number, workerIndex: number = 0): WorkerContext {
    return new WorkerContext({ workerId, workerIndex });
  }

  /**
   * Get the worker prefix for all identifiers
   * Format: w{workerId}-{testIndex}
   */
  getWorkerPrefix(): string {
    return `w${this.workerId}-${this.testIndex}`;
  }

  /**
   * Get worker ID
   */
  getWorkerId(): number {
    return this.workerId;
  }

  /**
   * Get current test index for this worker
   */
  getTestIndex(): number {
    return this.testIndex;
  }

  /**
   * Increment test index (call at start of each test)
   */
  incrementTestIndex(): void {
    this.testIndex++;
  }

  /**
   * Reset test index (useful for debugging)
   */
  resetTestIndex(): void {
    this.testIndex = 0;
  }

  /**
   * Generate worker-scoped email address
   * Format: w{workerId}-{testIndex}-{name}@example.com
   *
   * Examples:
   *   w1-0-admin@example.com
   *   w2-5-test-user@example.com
   */
  generateEmail(baseName: string = 'test'): string {
    const prefix = this.getWorkerPrefix();
    const email = `${prefix}-${baseName}@example.com`;

    this.trackResource({
      workerId: this.workerId,
      testIndex: this.testIndex,
      resourceType: 'email',
      resourceName: baseName,
      fullIdentifier: email,
    });

    return email;
  }

  /**
   * Generate worker-scoped organization name
   * Format: w{workerId}-{testIndex}-{name}
   *
   * Examples:
   *   w1-0-Test Org
   *   w2-5-Engineering Team
   */
  generateOrgName(baseName: string = 'Test Org'): string {
    const prefix = this.getWorkerPrefix();
    const orgName = `${prefix}-${baseName}`;

    this.trackResource({
      workerId: this.workerId,
      testIndex: this.testIndex,
      resourceType: 'organization',
      resourceName: baseName,
      fullIdentifier: orgName,
    });

    return orgName;
  }

  /**
   * Generate worker-scoped group name
   * Format: w{workerId}-{testIndex}-{name}
   */
  generateGroupName(baseName: string = 'Test Group'): string {
    const prefix = this.getWorkerPrefix();
    const groupName = `${prefix}-${baseName}`;

    this.trackResource({
      workerId: this.workerId,
      testIndex: this.testIndex,
      resourceType: 'group',
      resourceName: baseName,
      fullIdentifier: groupName,
    });

    return groupName;
  }

  /**
   * Generate worker-scoped model ID
   * Format: w{workerId}-{testIndex}-{name}
   */
  generateModelId(baseName: string = 'test-model'): string {
    const prefix = this.getWorkerPrefix();
    const modelId = `${prefix}-${baseName}`;

    this.trackResource({
      workerId: this.workerId,
      testIndex: this.testIndex,
      resourceType: 'model',
      resourceName: baseName,
      fullIdentifier: modelId,
    });

    return modelId;
  }

  /**
   * Generate worker-scoped conversation title
   * Format: w{workerId}-{testIndex}-{name}
   */
  generateConversationTitle(baseName: string = 'Test Conversation'): string {
    const prefix = this.getWorkerPrefix();
    const title = `${prefix}-${baseName}`;

    this.trackResource({
      workerId: this.workerId,
      testIndex: this.testIndex,
      resourceType: 'conversation',
      resourceName: baseName,
      fullIdentifier: title,
    });

    return title;
  }

  /**
   * Generate a unique UUID (for IDs that need full uniqueness)
   */
  generateUUID(): string {
    return randomUUID();
  }

  /**
   * Generate worker-scoped pattern for database queries
   * Returns LIKE pattern for matching all resources from this worker
   *
   * Examples:
   *   w1-% (all resources from worker 1)
   *   w1-5-% (all resources from worker 1, test 5)
   */
  getWorkerPattern(includeTestIndex: boolean = false): string {
    if (includeTestIndex) {
      return `${this.getWorkerPrefix()}-%`;
    }
    return `w${this.workerId}-%`;
  }

  /**
   * Get pattern for current test only
   */
  getCurrentTestPattern(): string {
    return `${this.getWorkerPrefix()}-%`;
  }

  /**
   * Track a created resource
   */
  private trackResource(resource: ResourceIdentifier): void {
    this.createdResources.push(resource);
  }

  /**
   * Get all tracked resources
   */
  getTrackedResources(): ResourceIdentifier[] {
    return [...this.createdResources];
  }

  /**
   * Get tracked resources by type
   */
  getResourcesByType(type: string): ResourceIdentifier[] {
    return this.createdResources.filter(r => r.resourceType === type);
  }

  /**
   * Clear tracked resources (call after cleanup)
   */
  clearTrackedResources(): void {
    this.createdResources = [];
  }

  /**
   * Get summary of worker context
   */
  getSummary(): string {
    return `Worker ${this.workerId}, Test ${this.testIndex}, Resources: ${this.createdResources.length}`;
  }

  /**
   * Check if an identifier belongs to this worker
   */
  isOwnedByWorker(identifier: string): boolean {
    const pattern = this.getWorkerPattern(false);
    const regex = new RegExp(`^w${this.workerId}-`);
    return regex.test(identifier);
  }

  /**
   * Check if an identifier belongs to current test
   */
  isOwnedByCurrentTest(identifier: string): boolean {
    const prefix = this.getWorkerPrefix();
    return identifier.startsWith(prefix);
  }

  /**
   * Parse worker info from identifier
   * Returns null if identifier doesn't match worker pattern
   */
  static parseIdentifier(identifier: string): {
    workerId: number;
    testIndex: number;
    resourceName: string;
  } | null {
    const match = identifier.match(/^w(\d+)-(\d+)-(.+)$/);
    if (!match) return null;

    return {
      workerId: parseInt(match[1], 10),
      testIndex: parseInt(match[2], 10),
      resourceName: match[3],
    };
  }
}

/**
 * Global worker context cache
 * Allows utilities to access current worker context
 */
class WorkerContextManager {
  private static instance: WorkerContextManager;
  private contexts: Map<number, WorkerContext> = new Map();
  private currentContext: WorkerContext | null = null;

  private constructor() {}

  static getInstance(): WorkerContextManager {
    if (!WorkerContextManager.instance) {
      WorkerContextManager.instance = new WorkerContextManager();
    }
    return WorkerContextManager.instance;
  }

  /**
   * Register a worker context (call in test fixture)
   */
  register(context: WorkerContext): void {
    const workerId = context.getWorkerId();
    this.contexts.set(workerId, context);
    this.currentContext = context;
  }

  /**
   * Get context for specific worker
   */
  getContext(workerId: number): WorkerContext | undefined {
    return this.contexts.get(workerId);
  }

  /**
   * Get current context (most recently registered)
   */
  getCurrentContext(): WorkerContext | null {
    return this.currentContext;
  }

  /**
   * Clear all contexts (useful for cleanup)
   */
  clearAll(): void {
    this.contexts.clear();
    this.currentContext = null;
  }
}

// Export singleton instance
export const workerContextManager = WorkerContextManager.getInstance();

/**
 * Helper function to get current worker context
 * Throws if no context is registered (must be used within test)
 */
export function getCurrentWorkerContext(): WorkerContext {
  const context = workerContextManager.getCurrentContext();
  if (!context) {
    throw new Error(
      'No worker context available. Make sure you are using the enhanced test fixture.'
    );
  }
  return context;
}

/**
 * Helper function to safely get worker context (returns null if not available)
 */
export function tryGetWorkerContext(): WorkerContext | null {
  return workerContextManager.getCurrentContext();
}
