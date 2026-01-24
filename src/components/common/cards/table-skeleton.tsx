import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  cols = 4,
  showHeader = true,
}) => {
  return (
    <div className="relative overflow-hidden">
      <div className="rounded-lg border">
        {/* Header */}
        {showHeader && (
          <div className="bg-muted/50 border-b">
            <div className="flex">
              {Array.from({ length: cols }).map((_, i) => (
                <div key={i} className="flex-1 p-4">
                  <div className="bg-muted-foreground/20 h-4 w-3/4 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="border-b last:border-b-0">
            <div className="flex">
              {Array.from({ length: cols }).map((_, colIndex) => (
                <div key={colIndex} className="flex-1 p-4">
                  <div
                    className="bg-muted-foreground/20 h-4 rounded"
                    style={{ width: `${Math.random() * 30 + 70}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/5" />
    </div>
  );
};
