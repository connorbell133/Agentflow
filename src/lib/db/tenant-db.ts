/**
 * Tenant-aware database wrapper using Supabase PostgREST
 * Provides automatic tenant filtering for all queries to prevent cross-organization data leaks
 *
 * This is the main entry point for all database operations that require tenant isolation.
 * RLS policies in Supabase provide database-level security, while this wrapper provides
 * additional application-level safety and a clean API.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getTenantContext, getOrgTenantContext, type TenantContext } from './tenant-context'
import {
  TenantResourceNotFound,
  TenantAccessViolation,
  logTenantViolation
} from './tenant-errors'
import type {
  Database,
  Conversation,
  ConversationInsert,
  ConversationUpdate,
  Message,
  MessageInsert,
  Model,
  ModelInsert,
  Group,
  GroupInsert,
  Invite,
  InviteInsert,
} from '@/lib/supabase/types'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

/**
 * Tenant-aware database instance
 * All queries automatically filter by org_id to enforce tenant isolation
 */
export class TenantDb {
  private supabase: SupabaseClient

  constructor(
    supabaseClient: SupabaseClient,
    public readonly context: TenantContext
  ) {
    this.supabase = supabaseClient
  }

  /**
   * Conversations - tenant-aware queries
   */
  get conversations() {
    const { org_id, userId } = this.context
    const supabase = this.supabase

    return {
      /**
       * Find all conversations for current user's organization
       */
      findMany: async (options?: { limit?: number; offset?: number; orderBy?: 'created_at' | 'title'; ascending?: boolean }) => {
        if (!org_id) {
          throw new TenantAccessViolation('conversation', 'all', userId, 'none')
        }

        let query = supabase
          .from('conversations')
          .select('*')
          .eq('org_id', org_id)

        if (options?.orderBy) {
          query = query.order(options.orderBy, { ascending: options.ascending ?? false })
        } else {
          query = query.order('created_at', { ascending: false })
        }

        if (options?.limit) {
          query = query.limit(options.limit)
        }

        if (options?.offset) {
          query = query.range(options.offset, options.offset + (options.limit ?? 100) - 1)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching conversations:', error)
          throw error
        }

        return data ?? []
      },

      /**
       * Find conversation by ID with tenant check
       */
      findById: async (conversationId: string): Promise<Conversation> => {
        if (!org_id) {
          throw new TenantAccessViolation('conversation', conversationId, userId, 'none')
        }

        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .eq('org_id', org_id)
          .single()

        if (error || !data) {
          // Don't reveal whether resource exists in another org
          throw new TenantResourceNotFound('conversation', conversationId)
        }

        return data
      },

      /**
       * Find conversations for current user
       */
      findByUser: async (options?: { limit?: number; offset?: number }) => {
        let query = supabase
          .from('conversations')
          .select('*')
          .eq('user', userId)
          .order('created_at', { ascending: false })

        if (org_id) {
          query = query.eq('org_id', org_id)
        }

        if (options?.limit) {
          query = query.limit(options.limit)
        }

        if (options?.offset) {
          query = query.range(options.offset, options.offset + (options.limit ?? 100) - 1)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching user conversations:', error)
          throw error
        }

        return data ?? []
      },

      /**
       * Create a new conversation with automatic org_id injection
       */
      create: async (data: Omit<ConversationInsert, 'org_id'>): Promise<Conversation[]> => {
        if (!org_id) {
          throw new TenantAccessViolation('conversation', 'new', userId, 'none')
        }

        const { data: result, error } = await supabase
          .from('conversations')
          .insert({
            ...data,
            org_id: org_id, // Auto-inject tenant context
          })
          .select()

        if (error) {
          console.error('Error creating conversation:', error)
          throw error
        }

        return result ?? []
      },

      /**
       * Update conversation with tenant validation
       * Note: org_id cannot be changed via this method
       */
      update: async (conversationId: string, data: Omit<Partial<ConversationUpdate>, 'org_id'>): Promise<Conversation[]> => {
        if (!org_id) {
          throw new TenantAccessViolation('conversation', conversationId, userId, 'none')
        }

        // First verify access
        await this.conversations.findById(conversationId)

        const updateData = data

        const { data: result, error } = await supabase
          .from('conversations')
          .update(updateData)
          .eq('id', conversationId)
          .eq('org_id', org_id)
          .select()

        if (error) {
          console.error('Error updating conversation:', error)
          throw error
        }

        return result ?? []
      },

      /**
       * Delete conversation with tenant validation
       */
      delete: async (conversationId: string): Promise<Conversation[]> => {
        if (!org_id) {
          throw new TenantAccessViolation('conversation', conversationId, userId, 'none')
        }

        // First verify access
        await this.conversations.findById(conversationId)

        const { data: result, error } = await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId)
          .eq('org_id', org_id)
          .select()

        if (error) {
          console.error('Error deleting conversation:', error)
          throw error
        }

        return result ?? []
      },
    }
  }

  /**
   * Messages - tenant-aware queries via conversation relationship
   */
  get messages() {
    const { userId } = this.context
    const supabase = this.supabase

    return {
      /**
       * Find messages for a conversation (with tenant check via conversation)
       */
      findByConversation: async (conversationId: string, options?: { limit?: number; cursor?: string; ascending?: boolean }): Promise<Message[]> => {
        // Verify conversation access first (this checks tenant)
        await this.conversations.findById(conversationId)

        let query = supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: options?.ascending ?? true })

        if (options?.cursor) {
          const ascending = options.ascending ?? true
          query = ascending
            ? query.gt('created_at', options.cursor)
            : query.lt('created_at', options.cursor)
        }

        if (options?.limit) {
          query = query.limit(options.limit)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching messages:', error)
          throw error
        }

        return data ?? []
      },

      /**
       * Create message in a conversation (with tenant check)
       */
      create: async (data: MessageInsert): Promise<Message[]> => {
        // Verify conversation access first
        await this.conversations.findById(data.conversation_id)

        const { data: result, error } = await supabase
          .from('messages')
          .insert(data)
          .select()

        if (error) {
          console.error('Error creating message:', error)
          throw error
        }

        return result ?? []
      },

      /**
       * Create multiple messages in a conversation
       */
      createMany: async (messages: MessageInsert[]): Promise<Message[]> => {
        if (messages.length === 0) return []

        // Verify conversation access first (all messages should be for the same conversation)
        const conversationIds = Array.from(new Set(messages.map(m => m.conversation_id)))
        for (const convId of conversationIds) {
          await this.conversations.findById(convId)
        }

        const { data: result, error } = await supabase
          .from('messages')
          .insert(messages)
          .select()

        if (error) {
          console.error('Error creating messages:', error)
          throw error
        }

        return result ?? []
      },
    }
  }

  /**
   * Models - tenant-aware queries
   */
  get models() {
    const { org_id, userId } = this.context
    const supabase = this.supabase

    return {
      findMany: async (options?: { limit?: number }) => {
        if (!org_id) {
          throw new TenantAccessViolation('model', 'all', userId, 'none')
        }

        let query = supabase
          .from('models')
          .select('*')
          .eq('org_id', org_id)

        if (options?.limit) {
          query = query.limit(options.limit)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching models:', error)
          throw error
        }

        return data ?? []
      },

      findById: async (model_id: string): Promise<Model> => {
        if (!org_id) {
          throw new TenantAccessViolation('model', model_id, userId, 'none')
        }

        const { data, error } = await supabase
          .from('models')
          .select('*')
          .eq('id', model_id)
          .eq('org_id', org_id)
          .single()

        if (error || !data) {
          throw new TenantResourceNotFound('model', model_id)
        }

        return data
      },

      findBynice_name: async (nice_name: string): Promise<Model | null> => {
        if (!org_id) {
          throw new TenantAccessViolation('model', nice_name, userId, 'none')
        }

        const { data, error } = await supabase
          .from('models')
          .select('*')
          .eq('nice_name', nice_name)
          .eq('org_id', org_id)
          .single()

        if (error || !data) {
          return null
        }

        return data
      },

      create: async (data: Omit<ModelInsert, 'org_id'>): Promise<Model[]> => {
        if (!org_id) {
          throw new TenantAccessViolation('model', 'new', userId, 'none')
        }

        const { data: result, error } = await supabase
          .from('models')
          .insert({ ...data, org_id: org_id })
          .select()

        if (error) {
          console.error('Error creating model:', error)
          throw error
        }

        return result ?? []
      },

      /**
       * Update model with tenant validation
       * Note: org_id cannot be changed via this method
       */
      update: async (model_id: string, data: Omit<Partial<Model>, 'org_id'>): Promise<Model[]> => {
        if (!org_id) {
          throw new TenantAccessViolation('model', model_id, userId, 'none')
        }

        // First verify access
        await this.models.findById(model_id)

        const updateData = data

        const { data: result, error } = await supabase
          .from('models')
          .update(updateData)
          .eq('id', model_id)
          .eq('org_id', org_id)
          .select()

        if (error) {
          console.error('Error updating model:', error)
          throw error
        }

        return result ?? []
      },

      delete: async (model_id: string): Promise<Model[]> => {
        if (!org_id) {
          throw new TenantAccessViolation('model', model_id, userId, 'none')
        }

        // First verify access
        await this.models.findById(model_id)

        const { data: result, error } = await supabase
          .from('models')
          .delete()
          .eq('id', model_id)
          .eq('org_id', org_id)
          .select()

        if (error) {
          console.error('Error deleting model:', error)
          throw error
        }

        return result ?? []
      },
    }
  }

  /**
   * Groups - tenant-aware queries
   */
  get groups() {
    const { org_id, userId } = this.context
    const supabase = this.supabase

    return {
      findMany: async (options?: { limit?: number }) => {
        if (!org_id) {
          throw new TenantAccessViolation('group', 'all', userId, 'none')
        }

        let query = supabase
          .from('groups')
          .select('*')
          .eq('org_id', org_id)

        if (options?.limit) {
          query = query.limit(options.limit)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching groups:', error)
          throw error
        }

        return data ?? []
      },

      findById: async (groupId: string): Promise<Group> => {
        if (!org_id) {
          throw new TenantAccessViolation('group', groupId, userId, 'none')
        }

        const { data, error } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .eq('org_id', org_id)
          .single()

        if (error || !data) {
          throw new TenantResourceNotFound('group', groupId)
        }

        return data
      },

      create: async (data: Omit<GroupInsert, 'org_id'>): Promise<Group[]> => {
        if (!org_id) {
          throw new TenantAccessViolation('group', 'new', userId, 'none')
        }

        const { data: result, error } = await supabase
          .from('groups')
          .insert({ ...data, org_id: org_id })
          .select()

        if (error) {
          console.error('Error creating group:', error)
          throw error
        }

        return result ?? []
      },

      delete: async (groupId: string): Promise<Group[]> => {
        if (!org_id) {
          throw new TenantAccessViolation('group', groupId, userId, 'none')
        }

        // First verify access
        await this.groups.findById(groupId)

        const { data: result, error } = await supabase
          .from('groups')
          .delete()
          .eq('id', groupId)
          .eq('org_id', org_id)
          .select()

        if (error) {
          console.error('Error deleting group:', error)
          throw error
        }

        return result ?? []
      },
    }
  }

  /**
   * Invites - tenant-aware queries
   */
  get invites() {
    const { org_id, userId } = this.context
    const supabase = this.supabase

    return {
      findMany: async () => {
        if (!org_id) {
          throw new TenantAccessViolation('invite', 'all', userId, 'none')
        }

        const { data, error } = await supabase
          .from('invites')
          .select('*')
          .eq('org_id', org_id)

        if (error) {
          console.error('Error fetching invites:', error)
          throw error
        }

        return data ?? []
      },

      findById: async (inviteId: string): Promise<Invite> => {
        if (!org_id) {
          throw new TenantAccessViolation('invite', inviteId, userId, 'none')
        }

        const { data, error } = await supabase
          .from('invites')
          .select('*')
          .eq('id', inviteId)
          .eq('org_id', org_id)
          .single()

        if (error || !data) {
          throw new TenantResourceNotFound('invite', inviteId)
        }

        return data
      },

      create: async (data: Omit<InviteInsert, 'org_id'>): Promise<Invite[]> => {
        if (!org_id) {
          throw new TenantAccessViolation('invite', 'new', userId, 'none')
        }

        const { data: result, error } = await supabase
          .from('invites')
          .insert({ ...data, org_id: org_id })
          .select()

        if (error) {
          console.error('Error creating invite:', error)
          throw error
        }

        return result ?? []
      },

      delete: async (inviteId: string): Promise<Invite[]> => {
        if (!org_id) {
          throw new TenantAccessViolation('invite', inviteId, userId, 'none')
        }

        // First verify access
        await this.invites.findById(inviteId)

        const { data: result, error } = await supabase
          .from('invites')
          .delete()
          .eq('id', inviteId)
          .eq('org_id', org_id)
          .select()

        if (error) {
          console.error('Error deleting invite:', error)
          throw error
        }

        return result ?? []
      },
    }
  }

  /**
   * Get raw Supabase client for complex queries
   * Use with caution - prefer the tenant-aware methods above
   */
  get raw() {
    return this.supabase
  }
}

/**
 * Get a tenant-aware database instance for the current user
 * This is the main entry point for tenant-safe queries
 *
 * @throws {TenantContextError} If user is not authenticated
 */
export async function getTenantDb(): Promise<TenantDb> {
  const [context, supabase] = await Promise.all([
    getTenantContext(),
    createSupabaseServerClient()
  ])
  return new TenantDb(supabase, context)
}

/**
 * Get a tenant-aware database instance that requires organization context
 * Use this when the operation must be performed within an organization
 *
 * @throws {TenantContextError} If user is not authenticated or not in an organization
 */
export async function getOrgTenantDb(): Promise<TenantDb> {
  const [context, supabase] = await Promise.all([
    getOrgTenantContext(),
    createSupabaseServerClient()
  ])
  return new TenantDb(supabase, context)
}

/**
 * Helper to execute a tenant-safe query with error handling
 */
export async function withTenantDb<T>(
  fn: (tenantDb: TenantDb) => Promise<T>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const tenantDb = await getTenantDb()
    const data = await fn(tenantDb)
    return { data, error: null }
  } catch (error) {
    if (error instanceof TenantAccessViolation) {
      logTenantViolation(error)
    }
    return { data: null, error: error as Error }
  }
}
