"use client";
import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/utils/cn";
import {
  ArrowUp,
  PanelLeftOpen,
  Edit3,
  GraduationCap,
  Code2,
  Coffee,
  ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useConversations } from "@/hooks/chat/use-conversations";
import { useModels } from "@/hooks/chat/use-models";
import { useUser } from "@/hooks/auth/use-user";
import { getUserOrgStatus } from "@/actions/organization/user-org-status";
import LoadingSpinner from "@/components/shared/loading/LoadingSpinner";
import MobileChatBox from "./MobileChatBox";
import MobileConversationList from "./MobileConversationList";
import MobileModelSelector from "./MobileModelSelector";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

const MobileChatContent = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, profile, isUserLoaded } = useUser();
  const [hasOrganization, setHasOrganization] = useState<boolean>(false);
  const [isCheckingOrg, setIsCheckingOrg] = useState(true);
  const { models, selectedModel, setSelectedModel } = useModels(user?.id ?? "");

  // Check if user has an organization
  useEffect(() => {
    const checkOrgStatus = async () => {
      if (!user?.id) {
        setIsCheckingOrg(false);
        return;
      }
      try {
        const orgStatus = await getUserOrgStatus(user.id);
        if (orgStatus.success && orgStatus.data) {
          setHasOrganization(orgStatus.data.hasOrganization);
        }
      } catch (error) {
        console.error("Error checking org status:", error);
      } finally {
        setIsCheckingOrg(false);
      }
    };
    checkOrgStatus();
  }, [user?.id]);
  const {
    conversations,
    currentConversation,
    selectConversation,
    sendMessage,
    newConversation,
    currentConversationMessages,
    isLoading,
    error,
    inputText,
    setInputText,
  } = useConversations();

  const [showSidebar, setShowSidebar] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Show error toast when error occurs
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (currentConversationMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [currentConversationMessages.length]); // Trigger when message count changes (initial load)

  // Auto-scroll for each new message
  useEffect(() => {
    if (currentConversationMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentConversationMessages]); // Trigger when messages array changes (new messages)

  // Handle focus to ensure proper keyboard behavior
  const handleInputFocus = () => {
    // Small delay to ensure keyboard is fully open
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 300);
  };

  // Handle visual viewport changes for keyboard
  useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        const fullHeight = window.innerHeight;
        const keyboardHeight = fullHeight - currentHeight;

        // Update CSS variable for keyboard height
        document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
      }
    };

    // Initial check
    handleViewportChange();

    // Listen for viewport changes
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  // Handle authentication
  if (!isUserLoaded && !user) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="xl" className="text-foreground" />
      </div>
    );
  }

  if (isUserLoaded && !user) {
    router.push("/sign-in");
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="xl" className="text-foreground" />
      </div>
    );
  }

  const handleSend = async () => {
    if (!inputText.trim() || !selectedModel || isLoading) return;

    await sendMessage(inputText, selectedModel);
    setInputText("");

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);

    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = profile?.full_name?.split(' ')[0] || "there";

    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  };

  // Check if user has no models
  const hasNoModels = !models || models.length === 0;

  // Show no models state
  if (hasNoModels && !isCheckingOrg) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-6 text-center">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
              <div className="relative bg-muted/30 backdrop-blur-sm p-6 rounded-full border border-border">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 100 100"
                  className="text-muted-foreground"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 30C20 23.3726 25.3726 18 32 18H68C74.6274 18 80 23.3726 80 30V55C80 61.6274 74.6274 67 68 67H45L32 75V67C25.3726 67 20 61.6274 20 55V30Z"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                  />
                  <line x1="40" y1="42" x2="60" y2="42" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              No AI Models Available
            </h2>
            {hasOrganization ? (
              <>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You don&apos;t have any AI models configured yet. Add models to your organization to get started.
                </p>
                <Button
                  onClick={() => router.push('/admin')}
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/20"
                >
                  Add Your Models
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You don&apos;t have access to any AI models yet. Create an organization or wait for an invite.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => router.push('/admin')}
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/20"
                  >
                    Create Your Organization
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        or
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Waiting for an invitation?</p>
                    <p className="text-[10px]">
                      Ask your admin to invite you for access.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-screen bg-background flex flex-col overflow-hidden text-foreground relative">
      {/* Safe area background extensions */}
      <div className="fixed inset-x-0 top-0 h-[env(safe-area-inset-top)] bg-background z-50" />
      <div className="fixed inset-x-0 bottom-0 h-[env(safe-area-inset-bottom)] bg-background z-40" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-[680px] mx-auto w-full px-4 relative z-0">
        {currentConversation && currentConversationMessages.length > 0 ? (
          // Active conversation view
          <div className="flex-1 w-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <MobileChatBox
                messages={currentConversationMessages}
                isLoading={isLoading}
                conversationId={currentConversation.id}
                model_id={selectedModel?.id}
                modelName={selectedModel?.nice_name || undefined}
              />
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>
        ) : (
          // Empty state - centered greeting
          <>
            {/* Sidebar toggle - top left */}
            <div className="absolute top-4 left-4 flex flex-row items-center gap-2" >
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </button>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary flex-shrink-0"
                onClick={newConversation}
                style={{ cursor: "pointer" }}
              >
                <path d="M15.6729 3.91287C16.8918 2.69392 18.8682 2.69392 20.0871 3.91287C21.3061 5.13182 21.3061 7.10813 20.0871 8.32708L14.1499 14.2643C13.3849 15.0293 12.3925 15.5255 11.3215 15.6785L9.14142 15.9899C8.82983 16.0344 8.51546 15.9297 8.29289 15.7071C8.07033 15.4845 7.96554 15.1701 8.01005 14.8586L8.32149 12.6785C8.47449 11.6075 8.97072 10.615 9.7357 9.85006L15.6729 3.91287ZM18.6729 5.32708C18.235 4.88918 17.525 4.88918 17.0871 5.32708L11.1499 11.2643C10.6909 11.7233 10.3932 12.3187 10.3014 12.9613L10.1785 13.8215L11.0386 13.6986C11.6812 13.6068 12.2767 13.3091 12.7357 12.8501L18.6729 6.91287C19.1108 6.47497 19.1108 5.76499 18.6729 5.32708ZM11 3.99929C11.0004 4.55157 10.5531 4.99963 10.0008 5.00007C9.00227 5.00084 8.29769 5.00827 7.74651 5.06064C7.20685 5.11191 6.88488 5.20117 6.63803 5.32695C6.07354 5.61457 5.6146 6.07351 5.32698 6.63799C5.19279 6.90135 5.10062 7.24904 5.05118 7.8542C5.00078 8.47105 5 9.26336 5 10.4V13.6C5 14.7366 5.00078 15.5289 5.05118 16.1457C5.10062 16.7509 5.19279 17.0986 5.32698 17.3619C5.6146 17.9264 6.07354 18.3854 6.63803 18.673C6.90138 18.8072 7.24907 18.8993 7.85424 18.9488C8.47108 18.9992 9.26339 19 10.4 19H13.6C14.7366 19 15.5289 18.9992 16.1458 18.9488C16.7509 18.8993 17.0986 18.8072 17.362 18.673C17.9265 18.3854 18.3854 17.9264 18.673 17.3619C18.7988 17.1151 18.8881 16.7931 18.9393 16.2535C18.9917 15.7023 18.9991 14.9977 18.9999 13.9992C19.0003 13.4469 19.4484 12.9995 20.0007 13C20.553 13.0004 21.0003 13.4485 20.9999 14.0007C20.9991 14.9789 20.9932 15.7808 20.9304 16.4426C20.8664 17.116 20.7385 17.7136 20.455 18.2699C19.9757 19.2107 19.2108 19.9756 18.27 20.455C17.6777 20.7568 17.0375 20.8826 16.3086 20.9421C15.6008 21 14.7266 21 13.6428 21H10.3572C9.27339 21 8.39925 21 7.69138 20.9421C6.96253 20.8826 6.32234 20.7568 5.73005 20.455C4.78924 19.9756 4.02433 19.2107 3.54497 18.2699C3.24318 17.6776 3.11737 17.0374 3.05782 16.3086C2.99998 15.6007 2.99999 14.7266 3 13.6428V10.3572C2.99999 9.27337 2.99998 8.39922 3.05782 7.69134C3.11737 6.96249 3.24318 6.3223 3.54497 5.73001C4.02433 4.7892 4.78924 4.0243 5.73005 3.54493C6.28633 3.26149 6.88399 3.13358 7.55735 3.06961C8.21919 3.00673 9.02103 3.00083 9.99922 3.00007C10.5515 2.99964 10.9996 3.447 11 3.99929Z" />
              </svg>
            </div>
            {/* Greeting */}
            <div className="text-center mb-12">
              <div className="text-[32px] font-light mb-8">
                {getGreeting()}
              </div>

              {/* Decorative element */}
              <div className="flex justify-center mb-8">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 0L19.2 12.8L32 16L19.2 19.2L16 32L12.8 19.2L0 16L12.8 12.8L16 0Z" fill="currentColor" className="text-primary" />
                </svg>
              </div>
            </div>
          </>
        )}

        {/* Input Area - Always at bottom */}
        <div className="w-full max-w-[680px] pb-safe flex flex-col" style={{
          paddingBottom: `calc(env(safe-area-inset-bottom) + var(--keyboard-height, 0px))`,
          transition: 'padding-bottom 0.3s ease-out'
        }}>
          <div className="relative mb-6 flex-1 bg-muted border border-border rounded-xl resize-none focus:outline-none focus:border-ring transition-all">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Start typing..."
              className="bg-transparent w-full px-4 py-3.5  text-[15px] 
                         placeholder-muted-foreground min-h-[56px]"
              rows={1}
              style={{ maxHeight: "150px" }}
              disabled={isLoading}
            />

            {/* Action buttons */}
            <div className="flex justify-end mr-2 mb-2 gap-1">

              {/* Model selector */}
              <button
                onClick={() => {
                  if (!(currentConversation && currentConversationMessages.length > 0)) {
                    setShowModelSelector(true);
                  }
                }}
                disabled={!!(currentConversation && currentConversationMessages.length > 0)}
                className={cn(
                  "ml-2 px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2",
                  currentConversation && currentConversationMessages.length > 0
                    ? "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60"
                    : "bg-muted hover:bg-accent"
                )}
              >
                {selectedModel?.nice_name}
                <ChevronDown className="h-3 w-3" />
              </button>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading}
                className={cn(
                  "ml-2 p-2 rounded-lg transition-all",
                  inputText.trim() && !isLoading
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Suggestion pills - only show when no conversation */}
          {!currentConversation && (
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => {
                  setInputText("Write a poem about robots");
                  handleSend();
                }}
                className="px-4 py-2 bg-muted hover:bg-accent rounded-full 
                           text-sm transition-colors flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Write
              </button>
              <button
                onClick={() => {
                  setInputText("Explain quantum computing");
                  handleSend();
                }}
                className="px-4 py-2 bg-muted hover:bg-accent rounded-full 
                           text-sm transition-colors flex items-center gap-2"
              >
                <GraduationCap className="h-4 w-4" />
                Learn
              </button>
              <button
                onClick={() => {
                  setInputText("Help me debug this code");
                  handleSend();
                }}
                className="px-4 py-2 bg-muted hover:bg-accent rounded-full 
                           text-sm transition-colors flex items-center gap-2"
              >
                <Code2 className="h-4 w-4" />
                Code
              </button>
              <button
                onClick={() => {
                  setInputText("Tell me something interesting");
                  handleSend();
                }}
                className="px-4 py-2 bg-muted hover:bg-accent rounded-full 
                           text-sm transition-colors flex items-center gap-2"
              >
                <Coffee className="h-4 w-4" />
                Life stuff
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <MobileConversationList
        open={showSidebar}
        onOpenChange={setShowSidebar}
        conversations={conversations}
        currentConversation={currentConversation}
        onSelectConversation={(conv) => {
          selectConversation(conv.id);
          setShowSidebar(false);
        }}
        onNewConversation={() => {
          newConversation();
          setShowSidebar(false);
        }}
        hasNoModels={hasNoModels}
      />

      {/* Model Selector */}
      <MobileModelSelector
        open={showModelSelector}
        onOpenChange={setShowModelSelector}
        models={models}
        selectedModel={selectedModel}
        onSelectModel={(model) => {
          setSelectedModel(model);
          setShowModelSelector(false);
        }}
      />
    </div>
  );
};

const MobileChat = () => {
  return (
    <ToastProvider>
      <MobileChatContent />
    </ToastProvider>
  );
};

export default MobileChat;