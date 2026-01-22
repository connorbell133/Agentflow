import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ChartSkeleton() {
    return (
        <Card className="@container/card animate-pulse">
            <CardHeader>
                <CardTitle>
                    <div className="h-6 bg-muted-foreground/20 rounded w-32"></div>
                </CardTitle>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">
                        <div className="h-4 bg-muted-foreground/20 rounded w-64"></div>
                    </span>
                    <span className="@[540px]/card:hidden">
                        <div className="h-4 bg-muted-foreground/20 rounded w-24"></div>
                    </span>
                </CardDescription>
                <CardAction>
                    {/* Desktop toggle group skeleton */}
                    <div className="hidden @[767px]/card:flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-8 w-24 bg-muted-foreground/20 rounded-md"></div>
                        ))}
                    </div>
                    {/* Mobile select skeleton */}
                    <div className="@[767px]/card:hidden">
                        <SelectTrigger className="flex w-40" disabled aria-label="Select a value">
                            <SelectValue>
                                <div className="h-4 bg-muted-foreground/20 rounded w-24"></div>
                            </SelectValue>
                        </SelectTrigger>
                    </div>
                </CardAction>
            </CardHeader>
            <div className="px-2 pt-4 sm:px-6 sm:pt-6 pb-6">
                <div className="aspect-auto h-[250px] w-full bg-muted-foreground/10 rounded-lg relative overflow-hidden">
                    {/* Chart bars simulation */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around h-full p-8">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div 
                                key={i} 
                                className="w-[12%] bg-muted-foreground/20 rounded-t"
                                style={{ height: `${Math.random() * 60 + 20}%` }}
                            />
                        ))}
                    </div>
                    {/* Shimmer overlay */}
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent" />
                </div>
            </div>
        </Card>
    )
}