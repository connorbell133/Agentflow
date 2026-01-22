import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

interface SectionCardProps {
    title: string;
    value: string;
    percentageChange: number;
    description: string;
    footerDescription: string;
    isLoading?: boolean;
}
function SectionCard({ title, value, percentageChange, description, footerDescription, isLoading = false }: SectionCardProps) {
    const isPositive = percentageChange > 0;
    const TrendIcon = isPositive ? IconTrendingUp : IconTrendingDown;

    return (
        <Card className="relative overflow-hidden">
            <CardHeader>
                <CardDescription>{title}</CardDescription>
                <CardTitle>
                    {isLoading ? (
                        <div className="h-8 w-24 bg-muted-foreground/20 rounded animate-pulse" />
                    ) : (
                        <span>{value}</span>
                    )}
                </CardTitle>
                {/* <CardAction>
                    {isLoading ? (
                        <div className="h-6 w-16 bg-muted-foreground/20 rounded animate-pulse" />
                    ) : (
                        <Badge variant="outline">
                            <TrendIcon />
                            {percentageChange > 0 ? "+" : ""}{percentageChange}%
                        </Badge>
                    )}
                </CardAction> */}
            </CardHeader>
            <CardFooter>
                {isLoading ? (
                    <>
                        <div className="h-4 w-32 bg-muted-foreground/20 rounded animate-pulse" />
                        <div className="h-3 w-24 bg-muted-foreground/20 rounded animate-pulse mt-1" />
                    </>
                ) : (
                    <>
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {description} <TrendIcon className="size-4" />
                        </div>
                        <div className="text-muted-foreground">
                            {footerDescription}
                        </div>
                    </>
                )}
            </CardFooter>
            {isLoading && (
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />
            )}
        </Card>
    )
}

interface SectionCardsProps {
    cards: SectionCardProps[];
}

export function SectionCards({ cards = [] }: SectionCardsProps = { cards: [] }) {
    return (
        <div className="grid grid-cols-4 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            {cards.map((card, index) => (
                <SectionCard key={index} {...card} />
            ))}
        </div>
    )
}
