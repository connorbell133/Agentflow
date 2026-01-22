import { Message } from "@/lib/supabase/types"
// ChatBox component
export interface ChatBoxProps {
  messages: Message[]; // Array of message objects
  isLoading: boolean;
  conversationId?: string;
  model_id?: string;
}
