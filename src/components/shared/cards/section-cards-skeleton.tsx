import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

function SectionCardSkeleton() {
    return (
        <Card className="relative overflow-hidden">
            <CardHeader>
                <CardDescription>
                    <div className="h-4 bg-muted-foreground/20 rounded w-24"></div>
                </CardDescription>
                <CardTitle>
                    <div className="h-8 bg-muted-foreground/20 rounded w-16"></div>
                </CardTitle>
                <CardAction>
                    <Badge variant="outline" className="px-3">
                        <div className="h-4 w-12 bg-muted-foreground/20 rounded"></div>
                    </Badge>
                </CardAction>
            </CardHeader>
            <CardFooter>
                <div className="flex gap-2 items-center">
                    <div className="h-4 bg-muted-foreground/20 rounded w-32"></div>
                    <div className="h-4 w-4 bg-muted-foreground/20 rounded"></div>
                </div>
                <div className="h-3 bg-muted-foreground/20 rounded w-24 mt-1"></div>
            </CardFooter>
            {/* Shimmer overlay */}
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />
        </Card>
    )
}

interface SectionCardsSkeletonProps {
    count?: number;
}

export function SectionCardsSkeleton({ count = 4 }: SectionCardsSkeletonProps) {
    return (
        <div className="grid grid-cols-4 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            {Array.from({ length: count }).map((_, index) => (
                <SectionCardSkeleton key={index} />
            ))}
        </div>
    )
}