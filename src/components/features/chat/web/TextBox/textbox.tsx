"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { Plus, SlidersHorizontal, Clock, ChevronDown, ArrowUp } from "lucide-react";
import { Model } from "@/lib/supabase/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export function TextBox({
  placeholders,
  value: propValue,
  onChange,
  onSubmit,
  disabled = false,
  models = [],
  selectedModel,
  onModelChange,
  onNewChat,
  onSettings,
  onHistory,
}: {
  placeholders: string[];
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
  models?: Model[];
  selectedModel?: Model | null;
  onModelChange?: (model: Model) => void;
  onNewChat?: () => void;
  onSettings?: () => void;
  onHistory?: () => void;
}) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startAnimation = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
  }, [placeholders.length]);
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState !== "visible" && intervalRef.current) {
      clearInterval(intervalRef.current); // Clear the interval when the tab is not visible
      intervalRef.current = null;
    } else if (document.visibilityState === "visible") {
      startAnimation(); // Restart the interval when the tab becomes visible
    }
  }, [startAnimation]);

  useEffect(() => {
    startAnimation();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [placeholders, handleVisibilityChange, startAnimation]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const newDataRef = useRef<any[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(propValue || "");
  const [animating, setAnimating] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [value]);

  const draw = useCallback(() => {
    if (!inputRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 800;
    ctx.clearRect(0, 0, 800, 800);
    const computedStyles = getComputedStyle(inputRef.current);

    const fontSize = parseFloat(computedStyles.getPropertyValue("font-size"));
    ctx.font = `${fontSize * 2}px ${computedStyles.fontFamily}`;
    ctx.fillStyle = "currentColor";
    ctx.fillText(value, 16, 40);

    const imageData = ctx.getImageData(0, 0, 800, 800);
    const pixelData = imageData.data;
    const newData: any[] = [];

    for (let t = 0; t < 800; t++) {
      let i = 4 * t * 800;
      for (let n = 0; n < 800; n++) {
        let e = i + 4 * n;
        if (
          pixelData[e] !== 0 &&
          pixelData[e + 1] !== 0 &&
          pixelData[e + 2] !== 0
        ) {
          newData.push({
            x: n,
            y: t,
            color: [
              pixelData[e],
              pixelData[e + 1],
              pixelData[e + 2],
              pixelData[e + 3],
            ],
          });
        }
      }
    }

    newDataRef.current = newData.map(({ x, y, color }) => ({
      x,
      y,
      r: 1,
      color: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`,
    }));
  }, [value]);

  useEffect(() => {
    if (propValue !== undefined) {
      setValue(propValue);
    }
  }, [propValue]);

  useEffect(() => {
    draw();
  }, [value, draw]);

  const animate = (start: number) => {
    const animateFrame = (pos: number = 0) => {
      requestAnimationFrame(() => {
        const newArr = [];
        for (let i = 0; i < newDataRef.current.length; i++) {
          const current = newDataRef.current[i];
          if (current.x < pos) {
            newArr.push(current);
          } else {
            if (current.r <= 0) {
              current.r = 0;
              continue;
            }
            current.x += Math.random() > 0.5 ? 1 : -1;
            current.y += Math.random() > 0.5 ? 1 : -1;
            current.r -= 0.05 * Math.random();
            newArr.push(current);
          }
        }
        newDataRef.current = newArr;
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.clearRect(pos, 0, 800, 800);
          newDataRef.current.forEach((t) => {
            const { x: n, y: i, r: s, color: color } = t;
            if (n > pos) {
              ctx.beginPath();
              ctx.rect(n, i, s, s);
              ctx.fillStyle = color;
              ctx.strokeStyle = color;
              ctx.stroke();
            }
          });
        }
        if (newDataRef.current.length > 0) {
          animateFrame(pos - 8);
        } else {
          setValue("");
          setAnimating(false);
        }
      });
    };
    animateFrame(start);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !animating && !disabled) {
      e.preventDefault();
      vanishAndSubmit();
    }
  };

  const vanishAndSubmit = () => {
    if (disabled) return;
    setAnimating(true);
    draw();

    const value = inputRef.current?.value || "";
    if (value && inputRef.current) {
      const maxX = newDataRef.current.reduce(
        (prev, current) => (current.x > prev ? current.x : prev),
        0
      );
      animate(maxX);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!disabled) {
      vanishAndSubmit();
      onSubmit && onSubmit(e);
    }
  };
  const handleModelSelect = (model_id: string) => {
    const model = models.find(m => m.id === model_id);
    if (model && onModelChange) {
      onModelChange(model);
    }
  };

  return (
    <form
      className={cn(
        "w-full max-w-4xl relative mx-auto rounded-2xl overflow-visible transition duration-200",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onSubmit={handleSubmit}
    >
      <fieldset className="flex flex-col items-center gap-0 bg-white dark:bg-[#3d3d3b] rounded-2xl p-1.5 border border-gray-200 dark:border-[#525250]">
        <div className="flex items-stretch gap-0 w-full">
          {/* Input Area */}
          <div
            className="flex-1 relative min-h-[52px] cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            <canvas
              className={cn(
                "absolute pointer-events-none text-base transform scale-50 top-[20%] left-2 origin-top-left filter invert-0 pr-20",
                !animating ? "opacity-0" : "opacity-100"
              )}
              ref={canvasRef}
            />
            <textarea
              onChange={(e) => {
                if (!animating && !disabled) {
                  setValue(e.target.value);
                  onChange && onChange(e);
                }
              }}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              value={value}
              disabled={disabled}
              rows={1}
              className={cn(
                "w-full relative text-base z-50 border-none text-gray-900 dark:text-[#FAF9F5] bg-transparent resize-none focus:outline-none focus:ring-0 py-3.5 px-3",
                animating && "text-transparent",
                disabled && "cursor-not-allowed"
              )}
              style={{ minHeight: '28px', maxHeight: '200px' }}
              aria-label="Message input"
            />

            {/* Animated Placeholder */}
            <div className="absolute inset-0 flex items-center pointer-events-none px-3">
              <AnimatePresence mode="wait">
                {!value && placeholders.length > 0 && (
                  <motion.p
                    initial={{
                      y: 5,
                      opacity: 0,
                    }}
                    key={`current-placeholder-${currentPlaceholder}`}
                    animate={{
                      y: 0,
                      opacity: 1,
                    }}
                    exit={{
                      y: -15,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.3,
                      ease: "linear",
                    }}
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

            {/* <div className="">
              Beta
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onNewChat}
                disabled={true}
                className="p-3 rounded-xl transition-colors text-[#6b6b69] cursor-not-allowed opacity-50"
                aria-label="New chat (Beta - Coming Soon)"
                title="Beta - Coming Soon"
              >
                <Plus className="w-5 h-5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={onSettings}
                disabled={true}
                className="p-3 rounded-xl transition-colors text-[#6b6b69] cursor-not-allowed opacity-50"
                aria-label="Settings (Beta - Coming Soon)"
                title="Beta - Coming Soon"
              >
                <SlidersHorizontal className="w-5 h-5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={onHistory}
                disabled={true}
                className="p-3 rounded-xl transition-colors text-[#6b6b69] cursor-not-allowed opacity-50"
                aria-label="History (Beta - Coming Soon)"
                title="Beta - Coming Soon"
              >
                <Clock className="w-5 h-5" strokeWidth={2} />
              </button>
            </div> */}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 shrink-0 pr-1 justify-end">
            {/* Model Selector Dropdown */}
            {models.length > 0 && (
              <Select
                value={selectedModel?.id || ""}
                onValueChange={handleModelSelect}
                disabled={disabled}
              >
                <SelectTrigger
                  className={cn(
                    "h-auto px-3 py-2 bg-transparent border-none text-gray-700 dark:text-[#FAF9F5] hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors focus:ring-0 focus:ring-offset-0",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={disabled}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium whitespace-nowrap">
                      {selectedModel?.nice_name || "Select Model"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-[#b3b3b0]" strokeWidth={2} />
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

            {/* Send Button */}
            <button
              type="submit"
              disabled={disabled || !value.trim() || animating}
              className={cn(
                "p-2 rounded-xl transition-all disabled:cursor-not-allowed shrink-0",
                value.trim() && !disabled && !animating
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-gray-300 dark:bg-[#525250] text-gray-500 dark:text-[#6b6b69]"
              )}
              aria-label="Send message"
            >
              <ArrowUp className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </fieldset>
    </form >
  );
}
