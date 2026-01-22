import { Conversation } from "@/lib/supabase/types";

// Function to group conversations
export function groupConversations(conversations: Conversation[]) {
    const grouped: { [key: string]: Conversation[] } = {
        Recents: [],
    };

    conversations.forEach((conversation) => {
        // Skip conversations with invalid or missing dates
        if (!conversation.created_at) return;

        const created_at = new Date(conversation.created_at);
        // Skip if date is invalid
        if (isNaN(created_at.getTime())) return;

        // Add all conversations to Recents
        grouped["Recents"].push(conversation);
    });

    // Conversations are already ordered newest first from the database queries
    // No need to reverse - they come in descending created_at order
    return grouped;
}
