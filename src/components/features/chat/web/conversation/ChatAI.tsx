/**
 * ChatAI Component
 *
 * AI SDK 6 compatible chat page using UIMessage streaming.
 * Uses useAIChat hook with ChatBoxAI and TextBoxAI components.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TextBoxAI } from '@/components/features/chat/web/TextBox/TextBoxAI';
import { cn } from '@/utils/cn';
import ChatBoxAI from '@/components/features/chat/web/ChatBox/ChatBoxAI';
import SideBarComponent from '@/components/layout/sidebars/SideBar/SideBar';
import { useAIChat } from '@/hooks/chat/use-ai-chat';
import { useChatData } from '@/hooks/chat/use-chat-data';
import { useUser } from '@/hooks/auth/use-user';
import { getUserOrgStatus } from '@/actions/organization/user-org-status';
import InviteBadge from '@/components/features/chat/web/invite/InviteBadge';
import LoadingSpinner from '@/components/shared/loading/LoadingSpinner';
import { DarkModeToggle } from '@/components/shared/theme/DarkModeToggle';
import { useRouter } from 'next/navigation';
import { IconInnerShadowTop } from '@tabler/icons-react';
import { createLogger } from '@/lib/infrastructure/logger';
import { FeedbackPanel } from '@/components/features/chat/web/feedback/FeedbackPanel';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/ui/use-mobile';
import MobileChat from '../../mobile/MobileChat';
import { ToastProvider, useToast } from '@/components/ui/toast';
import type { Model, Conversation } from '@/lib/supabase/types';

const logger = createLogger('ChatAI.tsx');

const ChatAIContent = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const { user, profile, isUserLoaded } = useUser();
  const [hasOrganization, setHasOrganization] = useState<boolean>(false);
  const [isCheckingOrg, setIsCheckingOrg] = useState(true);
  const [open, setOpen] = useState(true);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);

  // Use chat data hook for models and conversations
  const {
    models,
    conversations,
    selectedModel,
    setSelectedModel,
    refreshModels,
    addConversation,
    isLoading: isDataLoading,
    error: dataError,
  } = useChatData();

  // Local input state
  const [input, setInput] = useState('');

  // Use AI chat hook for messaging
  const {
    messages,
    sendMessage,
    isLoading: isChatLoading,
    error: chatError,
    stop,
    conversationId,
    startNewConversation,
    loadConversation,
    setModel,
    currentModel,
    status,
  } = useAIChat({
    model: selectedModel ?? undefined,
    org_id: selectedModel?.org_id,
    onConversationCreated: (newConvId) => {
      logger.info('Conversation created', { conversationId: newConvId });
      // Add to conversations list
      if (selectedModel) {
        addConversation({
          id: newConvId,
          user: user?.id ?? '',
          created_at: new Date().toISOString(),
          model: selectedModel.id,
          org_id: selectedModel.org_id,
          title: input.slice(0, 50) || 'New Chat',
        });
      }
    },
    onError: (error) => {
      logger.error('Chat error', { error });
      showToast(error.message, 'error');
    },
  });

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  // Handle submit
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      if (!input.trim()) return;

      const messageText = input;
      console.log('🟢 [ChatAI] Submitting message:', messageText);
      setInput(''); // Clear input immediately for better UX

      await sendMessage({ text: messageText });
    },
    [input, sendMessage]
  );

  // Check org status
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
        logger.error('Error checking org status:', error);
      } finally {
        setIsCheckingOrg(false);
      }
    };
    checkOrgStatus();
  }, [user?.id]);

  // Sync selected model to chat hook
  useEffect(() => {
    if (selectedModel && currentModel?.id !== selectedModel.id) {
      setModel(selectedModel);
    }
  }, [selectedModel, currentModel?.id, setModel]);

  // Handle model change
  const handleModelChange = useCallback(
    (model: any) => {
      setSelectedModel(model as any);
      setModel(model as any);
      startNewConversation();
    },
    [setSelectedModel, setModel, startNewConversation]
  );

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    async (convId: string | null) => {
      if (!convId) {
        startNewConversation();
        return;
      }
      try {
        await loadConversation(convId);
      } catch (error) {
        logger.error('Failed to load conversation', { error, conversationId: convId });
        showToast('Failed to load conversation', 'error');
      }
    },
    [loadConversation, startNewConversation, showToast]
  );

  // Handle new chat
  const handleNewChat = useCallback(() => {
    startNewConversation();
  }, [startNewConversation]);

  // Show errors via toast
  useEffect(() => {
    if (dataError) {
      showToast(dataError, 'error');
    }
  }, [dataError, showToast]);

  // Loading state
  if (!isUserLoaded && !user) {
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="xl" className="text-foreground" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (isUserLoaded && !user) {
    router.push('/sign-in');
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="xl" className="text-foreground" />
      </div>
    );
  }

  // Mobile view
  if (isMobile) {
    return <MobileChat />;
  }

  const hasNoModels = !models || models.length === 0;
  const isStreaming = status === 'streaming';
  const hasMessages = messages.length > 0;

  // Get current conversation for sidebar
  const currentConversation: Conversation | null = conversationId
    ? conversations.find((c) => c.id === conversationId) ?? {
        id: conversationId,
        user: user?.id ?? '',
        created_at: new Date().toISOString(),
        model: selectedModel?.id ?? '',
        org_id: selectedModel?.org_id ?? '',
        title: 'New Chat',
      }
    : null;

  return (
    <div
      className={cn(
        'flex flex-col md:flex-row flex-1 overflow-hidden',
        'h-screen w-screen bg-background text-foreground'
      )}
    >
      <SideBarComponent
        open={open}
        setOpen={setOpen}
        inputText={input}
        conversations={conversations}
        setConversation={handleSelectConversation}
        conversation={currentConversation}
        newConversation={handleNewChat}
        user={profile}
        isLoading={isDataLoading}
        models={models}
      />

      <section className="h-screen max-h-screen flex-1 flex flex-col overflow-hidden bg-background relative">
        {/* Top Menu */}
        <div className="flex w-full p-4 z-10 justify-end">
          <div className="flex items-center space-x-4">
            {conversationId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFeedbackPanel(true)}
                className="gap-2"
              >
                <MessageSquareText className="h-4 w-4" />
                <span>Feedback</span>
              </Button>
            )}
            <InviteBadge refreshModels={refreshModels} />
            <DarkModeToggle />
          </div>
        </div>

        {/* No Models State */}
        {hasNoModels && !isCheckingOrg && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full space-y-8 text-center">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
                  <div className="relative bg-muted/30 backdrop-blur-sm p-8 rounded-full border border-border">
                    <svg
                      width="64"
                      height="64"
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
                      <line
                        x1="40"
                        y1="42"
                        x2="60"
                        y2="42"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-foreground">No AI Models Available</h2>
                {hasOrganization ? (
                  <>
                    <p className="text-muted-foreground text-base leading-relaxed">
                      You don&apos;t have any AI models configured yet. Add models to your
                      organization to get started.
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
                    <p className="text-muted-foreground text-base leading-relaxed">
                      You don&apos;t have access to any AI models yet. To get started, you can
                      either wait for an invite to join an existing organization or create your own.
                    </p>
                    <div className="space-y-4">
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
                          <span className="bg-background px-2 text-muted-foreground">or</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <p>Waiting for an invitation?</p>
                        <p className="text-xs">
                          Ask your organization admin to invite you, and you&apos;ll receive access
                          to their AI models.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Initial State - Logo + TextBox */}
        {!hasNoModels && !hasMessages && (
          <div className="w-full mx-auto max-w-6xl px-2 xl:px-20 translate-y-6 py-24 text-center">
            <div className="w-full flex flex-col justify-center items-center">
              <div className="flex justify-center items-center w-full h-20 bg-background gap-3">
                <IconInnerShadowTop className="!size-12" />
                <h1
                  className="line-clamp-1"
                  style={{
                    fontFamily: 'Archivo, sans-serif',
                    fontSize: '40px',
                    lineHeight: '60px',
                    fontWeight: 400,
                    letterSpacing: 'normal',
                  }}
                >
                  {selectedModel?.nice_name ?? <span className="text-primary">Agent Flow</span>}
                </h1>
              </div>

              <div className="w-full p-5 max-w-3xl">
                <TextBoxAI
                  placeholders={[
                    'Ask me anything...',
                    'How can I help you today?',
                    'What would you like to know?',
                  ]}
                  value={input}
                  onChange={handleInputChange}
                  onSubmit={handleSubmit}
                  onStop={stop}
                  disabled={isChatLoading && !isStreaming}
                  isStreaming={isStreaming}
                  models={models}
                  selectedModel={selectedModel}
                  onModelChange={handleModelChange}
                  onNewChat={handleNewChat}
                />

                {/* Suggestion Prompts */}
                {selectedModel?.suggestion_prompts && selectedModel.suggestion_prompts.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2 pt-4">
                      {selectedModel.suggestion_prompts.map((prompt, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setInput(prompt);
                          }}
                          className="px-3 py-2 rounded-lg border border-border hover:border-muted-foreground/30 hover:bg-muted/50 transition-colors text-sm"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat View - Messages + TextBox */}
        {!hasNoModels && hasMessages && (
          <div className="flex-grow flex flex-col justify-between items-center w-full max-w-[48rem] mx-auto overflow-hidden">
            <div className="w-full h-[calc(100vh-80px)] overflow-auto max-h-[calc(100vh-160px)] flex flex-col">
              <ChatBoxAI
                messages={messages}
                isLoading={isChatLoading}
                conversationId={conversationId}
                model_id={selectedModel?.id}
                modelName={selectedModel?.nice_name ?? undefined}
              />
            </div>

            <div className="w-full py-5 px-5">
              <TextBoxAI
                placeholders={[
                  'Type your message...',
                  'Continue the conversation...',
                  'Ask a follow-up question...',
                ]}
                value={input}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                onStop={stop}
                disabled={isChatLoading && !isStreaming}
                isStreaming={isStreaming}
                models={models}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                onNewChat={handleNewChat}
              />
            </div>
          </div>
        )}
      </section>

      {/* Feedback Panel */}
      <FeedbackPanel
        open={showFeedbackPanel}
        onOpenChange={setShowFeedbackPanel}
        conversationId={conversationId}
        messages={messages.map((m) => ({
          id: m.id,
          role: m.role,
          ai_sdk_id: m.id,
          metadata: null,
          parts: null,
          content:
            m.parts
              ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map((p) => p.text)
              .join('') ?? '',
          conversation_id: conversationId ?? '',
          created_at: new Date().toISOString(),
        }))}
        getUserProfile={async (userId) => {
          try {
            const response = await fetch(
              `/api/user/profile?userId=${encodeURIComponent(userId)}`
            );
            if (response.ok) {
              const data = await response.json();
              return { email: data.email || userId, fullName: data.fullName || null };
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
          return { email: userId, fullName: null };
        }}
      />
    </div>
  );
};

const ChatAI = () => {
  return (
    <ToastProvider>
      <ChatAIContent />
    </ToastProvider>
  );
};

export default ChatAI;
export { ChatAI };
