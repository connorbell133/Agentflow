import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No items yet",
  description = "Get started by creating your first item",
  icon,
  action,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "flex flex-col items-center justify-center text-center p-4 sm:p-6 md:p-8",
        className
      )}
    >
      {icon && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mb-4"
        >
          {icon}
        </motion.div>
      )}
      
      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-xs sm:text-sm text-muted-foreground max-w-xs sm:max-w-sm mb-4 sm:mb-6">
        {description}
      </p>
      
      {action && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
};

export default EmptyState;