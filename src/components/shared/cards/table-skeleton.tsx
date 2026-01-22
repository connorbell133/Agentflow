import React from 'react';

interface TableSkeletonProps {
    rows?: number;
    cols?: number;
    showHeader?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
    rows = 5,
    cols = 4,
    showHeader = true
}) => {
    return (
        <div className="relative overflow-hidden">
            <div className="border rounded-lg">
                {/* Header */}
                {showHeader && (
                    <div className="bg-muted/50 border-b">
                        <div className="flex">
                            {Array.from({ length: cols }).map((_, i) => (
                                <div key={i} className="flex-1 p-4">
                                    <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
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
                                        className="h-4 bg-muted-foreground/20 rounded"
                                        style={{ width: `${Math.random() * 30 + 70}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {/* Shimmer overlay */}
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />
        </div>
    );
};