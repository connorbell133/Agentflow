import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/shared/cn';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No items yet',
  description = 'Get started by creating your first item',
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
        'flex flex-col items-center justify-center p-4 text-center sm:p-6 md:p-8',
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

      <h3 className="mb-2 text-base font-semibold text-foreground sm:text-lg">{title}</h3>

      <p className="mb-4 max-w-xs text-xs text-muted-foreground sm:mb-6 sm:max-w-sm sm:text-sm">
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
