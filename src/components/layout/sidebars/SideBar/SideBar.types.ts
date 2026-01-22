import { Conversation, Model } from "@/lib/supabase/types"

export interface SideBarComponentProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  inputText: string;
  conversation?: Conversation | null;
  conversations?: Conversation[];
  setConversation?: (conversationId: string | null) => void;
  newConversation?: () => void;
  user: any;
  isLoading?: boolean;
  models?: Model[];
}
