'use server';

import { auth } from '@clerk/nextjs/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Message } from '@/lib/supabase/types';

/**
 * Validate if a string is a valid UUID
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Find the actual message ID in the database
 * Handles AI SDK IDs (both short and UUID format) by looking up via ai_sdk_id column
 */
async function resolveMessageId(
  messageId: string,
  conversationId: string,
  supabase: any
): Promise<string | null> {
  console.log(`🔍 Resolving message ID: "${messageId}" in conversation ${conversationId}`);

  // First, try to find by ai_sdk_id (this handles AI SDK IDs)
  const { data: messagesByAiSdkId, error: aiSdkError } = await supabase
    .from('messages')
    .select('id, ai_sdk_id')
    .eq('conversation_id', conversationId)
    .eq('ai_sdk_id', messageId)
    .limit(1);

  if (aiSdkError) {
    console.error('Error querying by ai_sdk_id:', aiSdkError);
  }

  if (messagesByAiSdkId && messagesByAiSdkId.length > 0) {
    console.log(`✅ Resolved AI SDK ID "${messageId}" to database UUID "${messagesByAiSdkId[0].id}"`);
    return messagesByAiSdkId[0].id;
  }

  // Fallback: Check if it's already a database UUID (direct match on id column)
  if (isValidUUID(messageId)) {
    const { data: messagesById, error: idError } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('id', messageId)
      .limit(1);

    if (idError) {
      console.error('Error querying by id:', idError);
    }

    if (messagesById && messagesById.length > 0) {
      console.log(`✅ Message ID "${messageId}" is already a database UUID`);
      return messageId;
    }
  }

  // Debug: List all messages in the conversation to help diagnose the issue
  const { data: allMessages, error: allMessagesError } = await supabase
    .from('messages')
    .select('id, ai_sdk_id, role, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (!allMessagesError && allMessages) {
    console.log(`🔍 [Debug] All messages in conversation ${conversationId}:`,
      allMessages.map((m: Message) => ({
        id: m.id,
        ai_sdk_id: m.ai_sdk_id,
        role: m.role
      }))
    );

    // Try to find a match by checking if the messageId appears anywhere in the message data
    // This handles cases where the AI SDK generates different IDs on the frontend
    for (const msg of allMessages) {
      if (msg.ai_sdk_id === messageId || msg.id === messageId) {
        console.log(`✅ Found message by fallback search: ${msg.id}`);
        return msg.id;
      }
    }
  }

  console.warn(`⚠️ Could not resolve message ID "${messageId}" in conversation ${conversationId}`);
  return null;
}

export async function submitMessageFeedback(
  messageId: string,
  conversationId: string,
  model_id: string,
  positive: boolean | null,
  comment?: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    const supabase = await createSupabaseServerClient();

    // Resolve the message ID (handles AI SDK short IDs)
    let resolvedMessageId = await resolveMessageId(messageId, conversationId, supabase);

    // Fallback: If ID resolution fails, try to find the most recent assistant message
    // This handles cases where the AI SDK generates different IDs on the frontend
    if (!resolvedMessageId) {
      console.warn(`⚠️ Could not resolve message ID "${messageId}", trying fallback: most recent assistant message`);

      const { data: recentMessages, error: recentError } = await supabase
        .from('messages')
        .select('id, ai_sdk_id, role, created_at')
        .eq('conversation_id', conversationId)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!recentError && recentMessages && recentMessages.length > 0) {
        resolvedMessageId = recentMessages[0].id;
        console.log(`✅ Fallback: Using most recent assistant message ID: ${resolvedMessageId}`);
      } else {
        console.error('Could not resolve message ID:', messageId);
        return { success: false, error: 'Message not found' };
      }
    }

    // Check if user already has feedback for this message
    const { data: existingFeedback } = await supabase
      .from('message_feedback')
      .select('*')
      .eq('message_id', resolvedMessageId)
      .eq('user_id', userId)
      .single();

    if (existingFeedback) {
      // Update existing feedback
      const { error: updateError } = await supabase
        .from('message_feedback')
        .update({
          positive,
          comment: comment || existingFeedback.comment,
        })
        .eq('message_id', resolvedMessageId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating feedback:', updateError);
        return { success: false, error: 'Failed to update feedback' };
      }
    } else {
      // Create new feedback
      const { error: insertError } = await supabase.from('message_feedback').insert({
        message_id: resolvedMessageId,
        conversation_id: conversationId,
        model_id: model_id,
        user_id: userId,
        positive,
        comment: comment || null,
      });

      if (insertError) {
        console.error('Error inserting feedback:', insertError);
        return { success: false, error: 'Failed to submit feedback' };
      }
    }

    revalidatePath(`/chat/${conversationId}`);
    return { success: true };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return { success: false, error: 'Failed to submit feedback' };
  }
}

export async function updateFeedbackComment(
  messageId: string,
  conversationId: string,
  comment: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    const supabase = await createSupabaseServerClient();

    // Resolve the message ID (handles AI SDK short IDs)
    const resolvedMessageId = await resolveMessageId(messageId, conversationId, supabase);

    if (!resolvedMessageId) {
      console.error('Could not resolve message ID:', messageId);
      return { success: false, error: 'Message not found' };
    }

    await supabase
      .from('message_feedback')
      .update({ comment })
      .eq('message_id', resolvedMessageId)
      .eq('user_id', userId);

    revalidatePath(`/chat/${conversationId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating feedback comment:', error);
    return { success: false, error: 'Failed to update comment' };
  }
}

export async function getMessageFeedback(messageId: string, conversationId?: string) {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const supabase = await createSupabaseServerClient();

    // Resolve the message ID if conversation ID is provided
    let resolvedMessageId = messageId;
    if (conversationId && !isValidUUID(messageId)) {
      const resolved = await resolveMessageId(messageId, conversationId, supabase);
      if (!resolved) return null;
      resolvedMessageId = resolved;
    }

    // If still not a valid UUID, return null (can't query)
    if (!isValidUUID(resolvedMessageId)) {
      return null;
    }

    const { data: feedback, error } = await supabase
      .from('message_feedback')
      .select('*')
      .eq('message_id', resolvedMessageId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching feedback:', error);
      return null;
    }

    return feedback || null;
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return null;
  }
}

export async function getConversationFeedback(conversationId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    const supabase = await createSupabaseServerClient();

    const { data: feedback, error } = await supabase
      .from('message_feedback')
      .select('*')
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('Error fetching conversation feedback:', error);
      return [];
    }

    return feedback || [];
  } catch (error) {
    console.error('Error fetching conversation feedback:', error);
    return [];
  }
}

export async function getConversationsFeedbackSummary(conversationIds: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  if (conversationIds.length === 0) return [];

  try {
    const supabase = await createSupabaseServerClient();

    // Fetch all feedback for the conversations
    const { data: feedbackData, error } = await supabase
      .from('message_feedback')
      .select('conversation_id, positive, comment')
      .in('conversation_id', conversationIds);

    if (error) {
      console.error('Error fetching feedback summary:', error);
      return [];
    }

    // Aggregate in JS since PostgREST doesn't support GROUP BY directly
    const summaryMap = new Map<string, {
      conversationId: string;
      totalCount: number;
      positiveCount: number;
      negativeCount: number;
      commentCount: number;
    }>();

    for (const feedback of feedbackData || []) {
      const existing = summaryMap.get(feedback.conversation_id) || {
        conversationId: feedback.conversation_id,
        totalCount: 0,
        positiveCount: 0,
        negativeCount: 0,
        commentCount: 0,
      };

      existing.totalCount++;
      if (feedback.positive === true) existing.positiveCount++;
      if (feedback.positive === false) existing.negativeCount++;
      if (feedback.comment) existing.commentCount++;

      summaryMap.set(feedback.conversation_id, existing);
    }

    const result = Array.from(summaryMap.values());
    console.log('Feedback data from DB:', result);
    return result;
  } catch (error) {
    console.error('Error fetching feedback summary:', error);
    return [];
  }
}
