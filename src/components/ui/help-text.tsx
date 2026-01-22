import React from "react";
import { cn } from "@/utils/cn";
import { HelpCircleIcon } from "lucide-react";

interface HelpTextProps {
  children: React.ReactNode;
  className?: string;
}

const HelpText: React.FC<HelpTextProps> = ({ children, className }) => {
  return (
    <div className={cn("flex items-start gap-2 text-xs text-muted-foreground", className)}>
      <HelpCircleIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
};

export default HelpText;