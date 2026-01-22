import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface ModelCardProps {
    id: string;
    name: string;
    description: string;
    avatar?: string;
    status?: "online" | "offline" | "pending";
    tags?: string[];
    modelType?: string;
    onClick?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onExport?: () => void;
}

const ModelCard: React.FC<ModelCardProps> = ({
    id,
    name,
    description,
    avatar,
    status = "offline",
    tags = [],
    modelType = "AI Model",
    onClick,
    onEdit,
    onDelete,
    onExport,
}) => {
    const getStatusColor = () => {
        switch (status) {
            case "online":
                return "bg-green-500";
            case "pending":
                return "bg-yellow-500";
            default:
                return "bg-gray-500";
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Card
            className="group relative overflow-hidden bg-gradient-to-br from-card to-card/50 border border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 cursor-pointer w-full min-w-[260px]"
            onClick={onClick}
            data-testid={`model-card-${id}`}
        >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                            {avatar ? (
                                <Image
                                    src={avatar}
                                    alt={name}
                                    className="w-full h-full rounded-lg object-cover"
                                />
                            ) : (
                                <span className="text-primary font-semibold text-sm">
                                    {getInitials(name)}
                                </span>
                            )}
                        </div>
                        {/* Status indicator */}
                        <div className={`absolute -top-1 -right-1 w-4 h-4 ${getStatusColor()} rounded-full border-2 border-background`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0 pr-2">
                                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate" data-testid={`model-name-${id}`}>
                                    {name}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1 uppercase tracking-wide truncate">
                                    {modelType}
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity relative z-10 flex-shrink-0 ml-2">
                                {onExport && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 relative z-20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onExport();
                                        }}
                                        title="Export as YAML"
                                        data-testid={`model-export-${id}`}
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </Button>
                                )}
                                {onEdit && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 relative z-20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            console.log("ModelCard edit button clicked for:", name);
                                            onEdit();
                                        }}
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </Button>
                                )}
                                {onDelete && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive relative z-20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete();
                                        }}
                                        data-testid={`model-delete-${id}`}
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                            {description}
                        </p>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                                {tags.slice(0, 3).map((tag, index) => (
                                    <Badge
                                        key={index}
                                        variant="secondary"
                                        className="text-xs px-2 py-0.5"
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                                {tags.length > 3 && (
                                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                                        +{tags.length - 3}
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* Status badge */}
                        <div className="mt-3">
                            <Badge
                                variant={status === "online" ? "default" : "secondary"}
                                className={`text-xs ${status === "online"
                                    ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                                    : status === "pending"
                                        ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
                                        : "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"
                                    }`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusColor()}`} />
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ModelCard;
