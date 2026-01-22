import React from "react";
import {
  Sidebar,
  SidebarBody,
} from "@/components/layout/sidebars/SideBar/ChatSidebar";
import ConversationList from "@/components/features/chat/web/conversation/ConversationList/ConversationList";
import { SideBarComponentProps } from "./SideBar.types";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { IconInnerShadowTop, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useModels } from "@/hooks/chat/use-models";
import InviteBadge from "@/components/features/chat/web/invite/InviteBadge";
import GroupsBadge from "@/components/features/chat/web/groups/GroupsBadge";
import NewChat from "@/components/features/chat/shared/content/NewChat";
import { PanelRightClose, ArrowLeftToLine } from "lucide-react";
import { NamePopup } from "@/components/shared/menus/UserMenu";
const SideBarComponent: React.FC<SideBarComponentProps> = ({
  open,
  setOpen,
  conversation,
  conversations,
  setConversation,
  newConversation,
  user,
  isLoading,
  models,
}) => {
  if (!conversations) {
    conversations = [];
  }
  const { refreshModels } = useModels(user?.id ?? "");
  const hasNoModels = !models || models.length === 0;

  return (
    <Sidebar open={open} setOpen={setOpen}>
      {/* Toggle button */}


      <SidebarBody className="justify-between gap-10 relative">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className={`flex items-center gap-2 justify-start w-full h-9 rounded-lg ${open ? 'px-4' : 'px-4'} hover:bg-sidebar-accent/50 transition-all text-sidebar-foreground mb-2`}>
            <button
              onClick={() => setOpen(!open)}
              className="flex justify-center items-center flex-shrink-0"
              aria-label={open ? "Close sidebar" : "Open sidebar"}
            >
              {open ? <ArrowLeftToLine className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
            </button>
            <motion.div
              initial={false}
              animate={{
                width: open ? 'auto' : 0,
                opacity: open ? 1 : 0
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <h1
                className="text-[20px] leading-[28px] font-normal tracking-normal whitespace-nowrap"
                style={{
                  fontFamily: 'var(--font-bricolage-grotesque), ui-sans-serif, system-ui, sans-serif',
                  color: '#B6C3C0',
                  fontWeight: 400,
                  fontSize: '20px',
                  lineHeight: '28px',
                  letterSpacing: 'normal'
                }}
              >
                AgentFlow
              </h1>
            </motion.div>
          </div>


          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex flex-col gap-x-2">
              <NewChat
                newConversation={newConversation ?? (() => { })}
                open={open}
                disabled={hasNoModels}
              />
              <InviteBadge refreshModels={refreshModels} open={open} />
              <GroupsBadge open={open} />
            </div>
            {open && (
              <>
                <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
                  <ConversationList
                    conversations={conversations}
                    setConversation={setConversation}
                    selectedConversation={conversation}
                    newConversation={newConversation}
                    isLoading={isLoading}
                    hasModels={!hasNoModels}
                  />
                </div>
                <div className="border-t pt-3 pb-2 px-2">
                  {user && <NamePopup user={user} isOpen={true} location="bottom" />}
                </div>
              </>
            )}
          </div>
        </div>
      </SidebarBody>
    </Sidebar>
  );
};

export default SideBarComponent;
