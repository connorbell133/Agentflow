import React from 'react';

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse rounded-lg bg-muted p-6 ${className}`}>
      <div className="flex items-center space-x-4">
        <div className="bg-muted-foreground/20 h-12 w-12 rounded-lg"></div>
        <div className="flex-1 space-y-2">
          <div className="bg-muted-foreground/20 h-4 w-3/4 rounded"></div>
          <div className="bg-muted-foreground/20 h-3 w-1/2 rounded"></div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="bg-muted-foreground/20 h-8 w-1/4 rounded"></div>
        <div className="bg-muted-foreground/20 h-3 w-1/3 rounded"></div>
      </div>
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => {
  return (
    <div className="animate-pulse">
      <div className="overflow-hidden rounded-lg border">
        {/* Header */}
        <div className="bg-muted/50 border-b">
          <div className="flex">
            {Array.from({ length: cols }).map((_, i) => (
              <div key={i} className="flex-1 p-4">
                <div className="bg-muted-foreground/20 h-4 w-3/4 rounded"></div>
              </div>
            ))}
          </div>
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="border-b last:border-b-0">
            <div className="flex">
              {Array.from({ length: cols }).map((_, colIndex) => (
                <div key={colIndex} className="flex-1 p-4">
                  <div className="bg-muted-foreground/20 h-4 w-full rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonChart: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="rounded-lg border bg-card p-6">
        <div className="bg-muted-foreground/20 mb-4 h-6 w-1/4 rounded"></div>
        <div className="bg-muted-foreground/10 h-64 rounded"></div>
      </div>
    </div>
  );
};
