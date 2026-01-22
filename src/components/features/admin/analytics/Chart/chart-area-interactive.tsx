"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/ui/use-mobile"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ToggleGroup,
    ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
    Conversation,
} from "@/lib/supabase/types"

export const description = "An interactive area chart"

const chartConfig = {
    conversations: {
        label: "Conversations",
        color: "var(--chart-1)",
    },
} satisfies ChartConfig

interface ChartAreaInteractiveProps {
    org_id: string;
}
const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }

export function ChartAreaInteractive({ org_id }: ChartAreaInteractiveProps) {
    const isMobile = useIsMobile()
    const [timeRange, setTimeRange] = React.useState("90d")
    const handleTimeRangeChange = React.useCallback((val: string) => {
        if (!val) return
        setTimeRange(val)
    }, [])

    const [dailyCounts, setDailyCounts] = React.useState<{ date: string; count: number }[]>([])
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    // TEST: Hardcoded data to verify chart rendering
    const TEST_MODE = false // Set to true to test with hardcoded data
    const TEST_DATA = [
        { date: '2025-08-21', count: 5 },
        { date: '2025-08-22', count: 8 },
        { date: '2025-08-23', count: 3 },
        { date: '2025-08-24', count: 12 },
        { date: '2025-08-25', count: 15 },
    ]

    React.useEffect(() => {
        if (TEST_MODE) {
            setDailyCounts(TEST_DATA)
            return
        }

        const days = daysMap[timeRange] ?? 90
        if (!org_id) return
        const controller = new AbortController()
        const fetchData = async () => {
            try {
                setLoading(true)
                setError(null)
                const qs = new URLSearchParams({ org_id, days: String(days) })
                const res = await fetch(`/api/admin/analytics/conversations/daily?${qs.toString()}`, { signal: controller.signal })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const json = await res.json()
                console.log('[Chart] Raw API response:', json)
                setDailyCounts(json.data || [])
            } catch (e: any) {
                if (e.name !== 'AbortError') setError(e.message || 'Failed to load')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
        return () => controller.abort()
    }, [org_id, timeRange]) // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
        if (isMobile) {
            setTimeRange("7d")
        }
    }, [isMobile])

    const chartData = React.useMemo(() => {
        // Get the number of days for the selected range
        const days = daysMap[timeRange] ?? 90

        // Generate a complete array of dates for the time period
        const endDate = new Date()
        endDate.setUTCHours(0, 0, 0, 0)

        const startDate = new Date(endDate)
        startDate.setUTCDate(startDate.getUTCDate() - days + 1)

        // Create a map of existing data for quick lookup
        const dataMap = new Map<string, number>()
        dailyCounts?.forEach(({ date, count }) => {
            // Normalize the date to YYYY-MM-DD format
            const normalizedDate = date.split('T')[0]
            dataMap.set(normalizedDate, count)
        })

        // Generate complete date array with filled data
        const completeData = []
        const currentDate = new Date(startDate)

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0]
            const count = dataMap.get(dateStr) || 0

            completeData.push({
                date: `${dateStr}T00:00:00Z`,
                conversations: count
            })

            currentDate.setUTCDate(currentDate.getUTCDate() + 1)
        }

        console.log('[Chart] Processed chart data:', {
            timeRange,
            days,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalDays: completeData.length,
            daysWithData: dailyCounts?.length || 0,
            filledDates: completeData.slice(0, 5) // Show first 5 for debugging
        })

        return completeData
    }, [dailyCounts, timeRange])

    const yMax = React.useMemo(() => {
        return chartData.reduce((max, d) => {
            const num = typeof d.conversations === 'number' ? d.conversations : Number(d.conversations)
            return Math.max(max, isNaN(num) ? 0 : num)
        }, 0)
    }, [chartData])

    if (loading || error) {
        return (
            <Card className="@container/card animate-pulse">
                <CardHeader>
                    <CardTitle>Conversations</CardTitle>
                    <CardDescription>
                        <span className="hidden @[540px]/card:block">
                            Total conversations for the last 3 months
                        </span>
                        <span className="@[540px]/card:hidden">Last 3 months</span>
                    </CardDescription>
                    <CardAction>
                        <div className="hidden @[767px]/card:flex gap-1">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-8 w-24 bg-muted-foreground/20 rounded-md"></div>
                            ))}
                        </div>
                        <div className="@[767px]/card:hidden">
                            <Select disabled>
                                <SelectTrigger className="flex w-40" disabled aria-label="Select a value">
                                    <SelectValue>
                                        <div className="h-4 bg-muted-foreground/20 rounded w-24"></div>
                                    </SelectValue>
                                </SelectTrigger>
                            </Select>
                        </div>
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                    <div className="aspect-auto h-[250px] w-full bg-muted-foreground/10 rounded-lg relative overflow-hidden">
                        {error ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p>Failed to load data</p>
                            </div>
                        ) : (
                            <>
                                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around h-full p-8">
                                    {Array.from({ length: 7 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-[12%] bg-muted-foreground/20 rounded-t"
                                            style={{ height: `${Math.random() * 60 + 20}%` }}
                                        />
                                    ))}
                                </div>
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent" />
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="@container/card">
            <CardHeader>
                <CardTitle>Conversations</CardTitle>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">
                        Total conversations for the last 3 months
                    </span>
                    <span className="@[540px]/card:hidden">Last 3 months</span>
                </CardDescription>
                <CardAction>
                    <ToggleGroup
                        type="single"
                        value={timeRange}
                        onValueChange={handleTimeRangeChange}
                        variant="outline"
                        className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
                    >
                        <ToggleGroupItem value="365d">Last 365 days</ToggleGroupItem>
                        <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
                        <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
                        <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
                    </ToggleGroup>
                    <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                        <SelectTrigger
                            className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                            // size="sm"
                            aria-label="Select a value"
                        >
                            <SelectValue placeholder="Last 3 months" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="90d" className="rounded-lg">
                                Last 3 months
                            </SelectItem>
                            <SelectItem value="30d" className="rounded-lg">
                                Last 30 days
                            </SelectItem>
                            <SelectItem value="7d" className="rounded-lg">
                                Last 7 days
                            </SelectItem>
                            <SelectItem value="365d" className="rounded-lg">
                                Last 365 days
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[250px] w-full"
                >
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="fillConversations" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="var(--color-conversations)"
                                    stopOpacity={1.0}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--color-conversations)"
                                    stopOpacity={0.1}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <YAxis domain={[0, yMax || 1]} allowDecimals={false} tickMargin={8} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value) => {
                                const date = new Date(value)
                                return date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    timeZone: "UTC",
                                })
                            }}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => {
                                        return new Date(value).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            timeZone: "UTC",
                                        })
                                    }}
                                    indicator="dot"
                                />
                            }
                        />
                        <Area
                            dataKey="conversations"
                            type="natural"
                            fill="url(#fillConversations)"
                            stroke="var(--color-conversations)"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
