/**
 * TextBoxAI Component
 *
 * AI SDK 6 compatible text input that works with useAIChat hook.
 * Provides stop button during streaming and keyboard shortcuts.
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown, ArrowUp, Square } from 'lucide-react';
import { Model } from '@/lib/supabase/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

export interface TextBoxAIProps {
  /** Placeholder texts to cycle through */
  placeholders: string[];
  /** Current input value */
  value: string;
  /** Input change handler from useAIChat */
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Submit handler from useAIChat */
  onSubmit: (e?: React.FormEvent) => void;
  /** Stop streaming handler from useAIChat */
  onStop?: () => void;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Whether currently streaming */
  isStreaming?: boolean;
  /** Available models */
  models?: Model[];
  /** Currently selected model */
  selectedModel?: Model | null;
  /** Model change handler */
  onModelChange?: (model: any) => void;
  /** New chat handler */
  onNewChat?: () => void;
}

export function TextBoxAI({
  placeholders,
  value,
  onChange,
  onSubmit,
  onStop,
  disabled = false,
  isStreaming = false,
  models = [],
  selectedModel,
  onModelChange,
  onNewChat,
}: TextBoxAIProps) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Placeholder animation
  const startAnimation = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
  }, [placeholders.length]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState !== 'visible' && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else if (document.visibilityState === 'visible') {
      startAnimation();
    }
  }, [startAnimation]);

  useEffect(() => {
    startAnimation();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [placeholders, handleVisibilityChange, startAnimation]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [value]);

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !disabled && !isStreaming) {
      e.preventDefault();
      handleSubmit();
    }
    // Stop on Escape during streaming
    if (e.key === 'Escape' && isStreaming && onStop) {
      e.preventDefault();
      onStop();
    }
  };

  const handleSubmit = () => {
    if (disabled || isStreaming || !value.trim()) return;
    onSubmit();
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit();
  };

  const handleModelSelect = (model_id: string) => {
    const model = models.find((m) => m.id === model_id);
    if (model && onModelChange) {
      onModelChange(model);
    }
  };

  const handleStopClick = () => {
    if (onStop) {
      onStop();
    }
  };

  return (
    <form
      className={cn(
        'w-full max-w-4xl relative mx-auto rounded-2xl overflow-visible transition duration-200',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onSubmit={handleFormSubmit}
    >
      <fieldset className="flex flex-col items-center gap-0 bg-white dark:bg-[#3d3d3b] rounded-2xl p-1.5 border border-gray-200 dark:border-[#525250]">
        <div className="flex items-stretch gap-0 w-full">
          {/* Input Area */}
          <div
            className="flex-1 relative min-h-[52px] cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            <textarea
              ref={inputRef}
              value={value}
              onChange={onChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              rows={1}
              className={cn(
                'w-full relative text-base z-50 border-none text-gray-900 dark:text-[#FAF9F5] bg-transparent resize-none focus:outline-none focus:ring-0 py-3.5 px-3',
                disabled && 'cursor-not-allowed'
              )}
              style={{ minHeight: '28px', maxHeight: '200px' }}
              aria-label="Message input"
            />

            {/* Animated Placeholder */}
            <div className="absolute inset-0 flex items-center pointer-events-none px-3">
              <AnimatePresence mode="wait">
                {!value && placeholders.length > 0 && (
                  <motion.p
                    initial={{ y: 5, opacity: 0 }}
                    key={`current-placeholder-${currentPlaceholder}`}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -15, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'linear' }}
                    className="text-gray-400 dark:text-[#6b6b69] text-base font-normal text-left w-full truncate"
                  >
                    {placeholders[currentPlaceholder]}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-stretch gap-0 w-full justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-0 shrink-0 flex-1 relative">
            {/* Reserved for future buttons like New Chat, Settings, etc. */}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 shrink-0 pr-1 justify-end">
            {/* Model Selector Dropdown */}
            {models.length > 0 && (
              <Select
                value={selectedModel?.id || ''}
                onValueChange={handleModelSelect}
                disabled={disabled || isStreaming}
              >
                <SelectTrigger
                  className={cn(
                    'h-auto px-3 py-2 bg-transparent border-none text-gray-700 dark:text-[#FAF9F5] hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors focus:ring-0 focus:ring-offset-0',
                    (disabled || isStreaming) && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={disabled || isStreaming}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium whitespace-nowrap">
                      {selectedModel?.nice_name || 'Select Model'}
                    </span>
                    <ChevronDown
                      className="w-4 h-4 text-gray-500 dark:text-[#b3b3b0]"
                      strokeWidth={2}
                    />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#2a2a28] backdrop-blur-md border border-gray-200 dark:border-[#525250]">
                  {models.map((model) => (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      className="text-gray-900 dark:text-[#FAF9F5] focus:bg-gray-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-[#FAF9F5]"
                    >
                      {model.nice_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Stop/Send Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopClick}
                className="p-2 rounded-xl transition-all shrink-0 bg-red-500 hover:bg-red-600 text-white"
                aria-label="Stop streaming"
                title="Stop (Esc)"
              >
                <Square className="w-5 h-5" strokeWidth={2} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={disabled || !value.trim()}
                className={cn(
                  'p-2 rounded-xl transition-all disabled:cursor-not-allowed shrink-0',
                  value.trim() && !disabled
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    : 'bg-gray-300 dark:bg-[#525250] text-gray-500 dark:text-[#6b6b69]'
                )}
                aria-label="Send message"
                title="Send (Cmd+Enter)"
              >
                <ArrowUp className="w-5 h-5" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </fieldset>
    </form>
  );
}

export default TextBoxAI;
