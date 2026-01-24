/**
 * Resource Tracker
 *
 * Tracks all database resources created during tests for automatic cleanup.
 * Maintains dependency graph to ensure cleanup happens in correct order.
 *
 * Usage:
 *   const tracker = ResourceTracker.forTest(testInfo);
 *   await tracker.trackUser(userId, email);
 *   await tracker.trackOrganization(orgId, name);
 *   await tracker.cleanup(); // Automatically deletes in correct order
 */

import type { TestInfo } from '@playwright/test';
import type { WorkerContext } from './worker-context';

export enum ResourceType {
  AUTH_USER = 'auth_user',
  PROFILE = 'profile',
  ORGANIZATION = 'organization',
  ORG_MAP = 'org_map',
  GROUP = 'group',
  GROUP_MAP = 'group_map',
  MODEL = 'model',
  MODEL_MAP = 'model_map',
  CONVERSATION = 'conversation',
  MESSAGE = 'message',
  INVITE = 'invite',
  TEMP_ORG_REQUEST = 'temp_org_request',
}

export interface TrackedResource {
  type: ResourceType;
  id: string;
  identifier: string; // email, name, etc for debugging
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Defines cleanup order (children first, parents last)
 * Based on foreign key constraints
 */
const CLEANUP_ORDER: ResourceType[] = [
  ResourceType.MESSAGE, // references conversations, users
  ResourceType.CONVERSATION, // references users, orgs, models
  ResourceType.MODEL_MAP, // references models, groups, orgs
  ResourceType.GROUP_MAP, // references users, groups, orgs
  ResourceType.INVITE, // references users, orgs, groups
  ResourceType.TEMP_ORG_REQUEST, // references users
  ResourceType.GROUP, // references orgs
  ResourceType.MODEL, // references orgs
  ResourceType.ORG_MAP, // references users, orgs
  ResourceType.ORGANIZATION, // parent
  ResourceType.PROFILE, // users
  ResourceType.AUTH_USER, // auth users (last)
];

export class ResourceTracker {
  private resources: Map<ResourceType, TrackedResource[]> = new Map();
  private testInfo: TestInfo | null = null;
  private workerContext: WorkerContext | null = null;

  constructor(testInfo?: TestInfo, workerContext?: WorkerContext) {
    this.testInfo = testInfo || null;
    this.workerContext = workerContext || null;

    // Initialize maps for all resource types
    for (const type of Object.values(ResourceType)) {
      this.resources.set(type as ResourceType, []);
    }
  }

  /**
   * Create a tracker for a specific test
   */
  static forTest(testInfo: TestInfo, workerContext?: WorkerContext): ResourceTracker {
    return new ResourceTracker(testInfo, workerContext);
  }

  /**
   * Track an auth user
   */
  trackAuthUser(userId: string, email: string, metadata?: Record<string, any>): void {
    this.track(ResourceType.AUTH_USER, userId, email, metadata);
  }

  /**
   * Track a profile
   */
  trackProfile(userId: string, email: string, metadata?: Record<string, any>): void {
    this.track(ResourceType.PROFILE, userId, email, metadata);
  }

  /**
   * Track an organization
   */
  trackOrganization(orgId: string, name: string, metadata?: Record<string, any>): void {
    this.track(ResourceType.ORGANIZATION, orgId, name, metadata);
  }

  /**
   * Track an org_map entry
   */
  trackOrgMap(
    userId: string,
    orgId: string,
    identifier: string,
    metadata?: Record<string, any>
  ): void {
    this.track(ResourceType.ORG_MAP, `${userId}-${orgId}`, identifier, metadata);
  }

  /**
   * Track a group
   */
  trackGroup(groupId: string, name: string, metadata?: Record<string, any>): void {
    this.track(ResourceType.GROUP, groupId, name, metadata);
  }

  /**
   * Track a group_map entry
   */
  trackGroupMap(
    userId: string,
    groupId: string,
    identifier: string,
    metadata?: Record<string, any>
  ): void {
    this.track(ResourceType.GROUP_MAP, `${userId}-${groupId}`, identifier, metadata);
  }

  /**
   * Track a model
   */
  trackModel(modelId: string, name: string, metadata?: Record<string, any>): void {
    this.track(ResourceType.MODEL, modelId, name, metadata);
  }

  /**
   * Track a model_map entry
   */
  trackModelMap(
    modelId: string,
    groupId: string,
    identifier: string,
    metadata?: Record<string, any>
  ): void {
    this.track(ResourceType.MODEL_MAP, `${modelId}-${groupId}`, identifier, metadata);
  }

  /**
   * Track a conversation
   */
  trackConversation(conversationId: string, title: string, metadata?: Record<string, any>): void {
    this.track(ResourceType.CONVERSATION, conversationId, title, metadata);
  }

  /**
   * Track a message
   */
  trackMessage(messageId: string, content: string, metadata?: Record<string, any>): void {
    this.track(ResourceType.MESSAGE, messageId, content.substring(0, 50), metadata);
  }

  /**
   * Track an invite
   */
  trackInvite(inviteId: string, email: string, metadata?: Record<string, any>): void {
    this.track(ResourceType.INVITE, inviteId, email, metadata);
  }

  /**
   * Track a temp org request
   */
  trackTempOrgRequest(requestId: string, email: string, metadata?: Record<string, any>): void {
    this.track(ResourceType.TEMP_ORG_REQUEST, requestId, email, metadata);
  }

  /**
   * Generic track method
   */
  private track(
    type: ResourceType,
    id: string,
    identifier: string,
    metadata?: Record<string, any>
  ): void {
    const resource: TrackedResource = {
      type,
      id,
      identifier,
      createdAt: new Date(),
      metadata,
    };

    const resources = this.resources.get(type) || [];
    resources.push(resource);
    this.resources.set(type, resources);

    this.log(`Tracked ${type}: ${identifier} (${id})`);
  }

  /**
   * Get all tracked resources of a specific type
   */
  getResourcesByType(type: ResourceType): TrackedResource[] {
    return this.resources.get(type) || [];
  }

  /**
   * Get all tracked resources
   */
  getAllResources(): TrackedResource[] {
    const all: TrackedResource[] = [];
    for (const resources of this.resources.values()) {
      all.push(...resources);
    }
    return all;
  }

  /**
   * Get resource count by type
   */
  getResourceCount(type: ResourceType): number {
    return (this.resources.get(type) || []).length;
  }

  /**
   * Get total resource count
   */
  getTotalCount(): number {
    let total = 0;
    for (const resources of this.resources.values()) {
      total += resources.length;
    }
    return total;
  }

  /**
   * Get resources in cleanup order
   */
  getResourcesInCleanupOrder(): TrackedResource[] {
    const ordered: TrackedResource[] = [];

    for (const type of CLEANUP_ORDER) {
      const resources = this.resources.get(type) || [];
      ordered.push(...resources);
    }

    return ordered;
  }

  /**
   * Get IDs by type in cleanup order
   */
  getIDsByTypeInCleanupOrder(): Map<ResourceType, string[]> {
    const idsByType = new Map<ResourceType, string[]>();

    for (const type of CLEANUP_ORDER) {
      const resources = this.resources.get(type) || [];
      const ids = resources.map(r => r.id);
      if (ids.length > 0) {
        idsByType.set(type, ids);
      }
    }

    return idsByType;
  }

  /**
   * Clear all tracked resources
   */
  clear(): void {
    for (const type of Object.values(ResourceType)) {
      this.resources.set(type as ResourceType, []);
    }
    this.log('Cleared all tracked resources');
  }

  /**
   * Get summary of tracked resources
   */
  getSummary(): string {
    const summary: string[] = ['Tracked Resources:'];

    for (const type of CLEANUP_ORDER) {
      const count = this.getResourceCount(type);
      if (count > 0) {
        summary.push(`  ${type}: ${count}`);
      }
    }

    summary.push(`Total: ${this.getTotalCount()}`);
    return summary.join('\n');
  }

  /**
   * Export tracked resources for debugging
   */
  export(): Record<string, TrackedResource[]> {
    const exported: Record<string, TrackedResource[]> = {};

    for (const [type, resources] of this.resources.entries()) {
      if (resources.length > 0) {
        exported[type] = resources;
      }
    }

    return exported;
  }

  /**
   * Import tracked resources (useful for test debugging)
   */
  import(data: Record<string, TrackedResource[]>): void {
    for (const [type, resources] of Object.entries(data)) {
      this.resources.set(type as ResourceType, resources);
    }
  }

  /**
   * Check if any resources are tracked
   */
  hasResources(): boolean {
    return this.getTotalCount() > 0;
  }

  /**
   * Log helper
   */
  private log(message: string): void {
    if (this.testInfo) {
      // Attach to test if available
      const prefix = this.workerContext
        ? `[Worker ${this.workerContext.getWorkerId()}]`
        : '[ResourceTracker]';
      console.log(`${prefix} ${message}`);
    }
  }
}

/**
 * Global tracker instance for utilities
 */
class ResourceTrackerManager {
  private static instance: ResourceTrackerManager;
  private trackers: Map<string, ResourceTracker> = new Map();
  private currentTracker: ResourceTracker | null = null;

  private constructor() {}

  static getInstance(): ResourceTrackerManager {
    if (!ResourceTrackerManager.instance) {
      ResourceTrackerManager.instance = new ResourceTrackerManager();
    }
    return ResourceTrackerManager.instance;
  }

  /**
   * Register a tracker for a test
   */
  register(testId: string, tracker: ResourceTracker): void {
    this.trackers.set(testId, tracker);
    this.currentTracker = tracker;
  }

  /**
   * Get tracker for a test
   */
  getTracker(testId: string): ResourceTracker | undefined {
    return this.trackers.get(testId);
  }

  /**
   * Get current tracker (most recently registered)
   */
  getCurrentTracker(): ResourceTracker | null {
    return this.currentTracker;
  }

  /**
   * Remove tracker
   */
  unregister(testId: string): void {
    this.trackers.delete(testId);
    if (this.currentTracker && this.trackers.size > 0) {
      this.currentTracker = Array.from(this.trackers.values()).pop() || null;
    } else if (this.trackers.size === 0) {
      this.currentTracker = null;
    }
  }

  /**
   * Clear all trackers
   */
  clearAll(): void {
    this.trackers.clear();
    this.currentTracker = null;
  }
}

// Export singleton
export const resourceTrackerManager = ResourceTrackerManager.getInstance();

/**
 * Get current resource tracker
 */
export function getCurrentResourceTracker(): ResourceTracker {
  const tracker = resourceTrackerManager.getCurrentTracker();
  if (!tracker) {
    throw new Error(
      'No resource tracker available. Make sure you are using the enhanced test fixture.'
    );
  }
  return tracker;
}

/**
 * Safely get resource tracker (returns null if not available)
 */
export function tryGetResourceTracker(): ResourceTracker | null {
  return resourceTrackerManager.getCurrentTracker();
}
