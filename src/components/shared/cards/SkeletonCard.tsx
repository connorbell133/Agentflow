import React from 'react';

interface SkeletonCardProps {
    className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '' }) => {
    return (
        <div className={`animate-pulse bg-muted rounded-lg p-6 ${className}`}>
            <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-muted-foreground/20 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
                    <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
                </div>
            </div>
            <div className="mt-4 space-y-2">
                <div className="h-8 bg-muted-foreground/20 rounded w-1/4"></div>
                <div className="h-3 bg-muted-foreground/20 rounded w-1/3"></div>
            </div>
        </div>
    );
};

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
    rows = 5,
    cols = 4
}) => {
    return (
        <div className="animate-pulse">
            <div className="border rounded-lg overflow-hidden">
                {/* Header */}
                <div className="bg-muted/50 border-b">
                    <div className="flex">
                        {Array.from({ length: cols }).map((_, i) => (
                            <div key={i} className="flex-1 p-4">
                                <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
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
                                    <div className="h-4 bg-muted-foreground/20 rounded w-full"></div>
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
            <div className="bg-card rounded-lg p-6 border">
                <div className="h-6 bg-muted-foreground/20 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-muted-foreground/10 rounded"></div>
            </div>
        </div>
    );
};