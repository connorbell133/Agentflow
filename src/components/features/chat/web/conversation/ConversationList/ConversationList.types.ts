import { Conversation } from "@/lib/supabase/types"
export interface ConversationListProps {
    conversations: Conversation[];
    setConversation?: (conversationId: string | null) => void;
    selectedConversation?: Conversation | null;
    newConversation?: () => void;
    isLoading?: boolean;
    hasModels?: boolean;
}