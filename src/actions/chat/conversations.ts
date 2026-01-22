"use server";

import { getTenantDb } from "@/lib/db/tenant-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withQueryTracking } from "@/utils/helpers/query";
import { withCache, queryCache } from "@/lib/core/cache";
import { PaginationParams, CursorPaginationParams } from "@/lib/core/pagination";
import { createLogger } from "@/lib/infrastructure/logger";
import type { Conversation, Message } from "@/lib/supabase/types";

const logger = createLogger("conversations-actions");


// CONVERSATION FUNCTIONS
export async function getConversations(userId: string): Promise<{ data: Conversation[], error: Error | null }> {
    return withCache(
        `conversations:${userId}`,
        () => withQueryTracking('getConversations', async () => {
            try {
                const supabase = await createSupabaseServerClient();

                const { data, error } = await supabase
                    .from('conversations')
                    .select('*')
                    .eq('user', userId)
                    .order('created_at', { ascending: false }); // Most recent first

                if (error) {
                    throw error;
                }

                return { data: data ?? [], error: null };
            } catch (error) {
                logger.error('Error fetching conversations', { error: error instanceof Error ? error.message : 'Unknown error', userId: userId });
                throw error;
            }
        }),
        2 * 60 * 1000 // 2 minutes TTL
    );
}

// Optimized query for conversation list with pagination
export async function getConversationList(
    userId: string,
    params: PaginationParams = { page: 0, limit: 20 }
) {
    return withCache(
        `conversations:list:${userId}:${params.page}:${params.limit}`,
        () => withQueryTracking('getConversationList', async () => {
            const supabase = await createSupabaseServerClient();

            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .eq('user', userId)
                .order('created_at', { ascending: false }) // Most recent first
                .range(params.page * params.limit, (params.page + 1) * params.limit - 1);

            if (error) {
                throw error;
            }

            return data ?? [];
        }),
        1 * 60 * 1000 // 1 minute TTL
    );
}

// Optimized conversation with messages query (eliminates N+1)
export async function getConversationWithMessages(conversationId: string): Promise<{ conversation: Conversation, messages: Message[] }> {
    return withCache(
        `conversation:full:${conversationId}`,
        () => withQueryTracking('getConversationWithMessages', async () => {
            // SECURITY: Use tenant-aware query to prevent cross-org access
            const tenantDb = await getTenantDb();

            // Verify conversation access (throws if not authorized)
            const conversation = await tenantDb.conversations.findById(conversationId);

            // Get messages (already validated via conversation check)
            const message_list = await tenantDb.messages.findByConversation(conversationId);

            logger.debug('Fetched conversation with messages', { conversationId, messageCount: message_list.length });

            return {
                conversation,
                messages: message_list
            };
        }),
        5 * 60 * 1000 // 5 minutes TTL
    );
}

export interface ConversationFilters {
    userId?: string;
    model_id?: string;
    startDate?: Date;
    endDate?: Date;
}

export async function getOrgConversations(
    org_id: string,
    params: PaginationParams = { page: 1, limit: 50 },
    filters?: ConversationFilters
) {
    const cacheKey = `org:conversations:${org_id}:${params.page}:${params.limit}:${JSON.stringify(filters || {})}`;

    return withCache(
        cacheKey,
        () => withQueryTracking('getOrgConversations', async () => {
            const supabase = await createSupabaseServerClient();

            let query = supabase
                .from('conversations')
                .select('*')
                .eq('org_id', org_id);

            // Apply filters
            if (filters?.userId) {
                query = query.eq('user', filters.userId);
            }

            if (filters?.model_id) {
                query = query.eq('model', filters.model_id);
            }

            if (filters?.startDate) {
                query = query.gte('created_at', filters.startDate.toISOString());
            }

            if (filters?.endDate) {
                query = query.lte('created_at', filters.endDate.toISOString());
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .range((params.page - 1) * params.limit, params.page * params.limit - 1);

            if (error) {
                throw error;
            }

            return { data: data ?? [], error: null };
        }),
        2 * 60 * 1000 // 2 minutes TTL
    );
}

// Grouped last conversation per user for an org
export async function getOrgUsersLastConversation(org_id: string): Promise<Array<{ user: string; lastcreated_at: string | null }>> {
    return withCache(
        `org:users:lastConversation:${org_id}`,
        () => withQueryTracking('getOrgUsersLastConversation', async () => {
            const supabase = await createSupabaseServerClient();

            // Use Supabase's ability to get distinct users and their max created_at
            // Note: For complex aggregations, consider creating a database view or RPC function
            const { data, error } = await supabase
                .from('conversations')
                .select('user, created_at')
                .eq('org_id', org_id)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            // Group by user and get the latest created_at
            const userMap = new Map<string, string>();
            for (const row of data ?? []) {
                if (!userMap.has(row.user)) {
                    userMap.set(row.user, row.created_at);
                }
            }

            return Array.from(userMap.entries()).map(([user, lastcreated_at]) => ({
                user,
                lastcreated_at
            }));
        }),
        2 * 60 * 1000 // 2 minutes TTL
    );
}

// Last conversation per user across ALL orgs
export async function getUsersLastConversation(): Promise<Array<{ user: string; lastcreated_at: string | null }>> {
    return withCache(
        `users:lastConversation:all`,
        async () => {
            const supabase = await createSupabaseServerClient();

            const { data, error } = await supabase
                .from('conversations')
                .select('user, created_at')
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            // Group by user and get the latest created_at
            const userMap = new Map<string, string>();
            for (const row of data ?? []) {
                if (!userMap.has(row.user)) {
                    userMap.set(row.user, row.created_at);
                }
            }

            return Array.from(userMap.entries()).map(([user, lastcreated_at]) => ({
                user,
                lastcreated_at
            }));
        },
        2 * 60 * 1000
    );
}

export async function getConversation(conversationId: string) {
    // SECURITY: Use tenant-aware query to prevent cross-org access
    const tenantDb = await getTenantDb();

    try {
        const conversation = await tenantDb.conversations.findById(conversationId);
        return [conversation]; // Maintain array format for backward compatibility
    } catch (error) {
        // If not found or access denied, return empty array
        return [];
    }
}

export async function createConvo(conversation: Omit<Conversation, 'id' | 'created_at' | 'org_id'> & { id?: string; created_at?: string; org_id?: string }) {
    // SECURITY: Use tenant-aware creation to auto-inject org_id
    const tenantDb = await getTenantDb();

    // Remove org_id from input to prevent injection, it will be auto-added
    const { org_id, ...conversationData } = conversation;

    const data = await tenantDb.conversations.create(conversationData);

    return data;
}


// MESSAGE FUNCTIONS
export async function getMessages(
    conversationId: string,
    params: CursorPaginationParams = { limit: 50 }
) {
    return withCache(
        `messages:${conversationId}:${params.cursor || 'latest'}:${params.limit}`,
        () => withQueryTracking('getMessages', async () => {
            const tenantDb = await getTenantDb();

            // Verify conversation access first
            await tenantDb.conversations.findById(conversationId);

            const supabase = await createSupabaseServerClient();

            let query = supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false }) // Latest first for cursor pagination
                .limit(params.limit);

            // Apply cursor if provided
            if (params.cursor) {
                query = query.lt('created_at', params.cursor);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            const messages = data ?? [];

            // Reverse data to get chronological order for display
            messages.reverse();

            // Get next cursor
            const nextCursor = messages.length > 0 ? messages[0].created_at : null;
            const hasMore = messages.length === params.limit;

            return {
                data: messages,
                nextCursor,
                hasMore
            };
        }),
        1 * 60 * 1000 // 1 minute TTL
    );
}

// Get all messages for a conversation (for when you need the complete history)
export async function getAllMessages(conversationId: string) {
    return withCache(
        `messages:all:${conversationId}`,
        () => withQueryTracking('getAllMessages', async () => {
            const tenantDb = await getTenantDb();

            // Get messages with tenant check via conversation
            const data = await tenantDb.messages.findByConversation(conversationId);
            return data;
        }),
        5 * 60 * 1000 // 5 minutes TTL
    );
}

export async function addMessage(userMessage: Omit<Message, 'id' | 'created_at'> & { id?: string; created_at?: string }) {
    return withQueryTracking('addMessage', async () => {
        // SECURITY: Use tenant-aware message creation (validates conversation access)
        const tenantDb = await getTenantDb();

        const data = await tenantDb.messages.create({
            conversation_id: userMessage.conversation_id,
            content: userMessage.content,
            role: userMessage.role
        });

        queryCache.invalidate(`messages:${userMessage.conversation_id}`);
        queryCache.invalidate(`messages:all:${userMessage.conversation_id}`);
        queryCache.invalidate(`conversation:full:${userMessage.conversation_id}`);

        return data;
    });
}

// Batch insert for better performance
export async function insertMessages(message_data: Array<{
    content: string | null;
    role: string | null;
    conversation_id: string;
}>) {
    return withQueryTracking('insertMessages', async () => {
        if (message_data.length === 0) {
            return [];
        }

        // Verify conversation access for all messages
        const tenantDb = await getTenantDb();

        const data = await tenantDb.messages.createMany(message_data);

        // Invalidate cache for all affected conversations
        const conversationIds = Array.from(new Set(message_data.map(m => m.conversation_id)));

        for (const convId of conversationIds) {
            queryCache.invalidate(`messages:${convId}`);
            queryCache.invalidate(`messages:all:${convId}`);
            queryCache.invalidate(`conversation:full:${convId}`);
        }

        return data;
    });
}
