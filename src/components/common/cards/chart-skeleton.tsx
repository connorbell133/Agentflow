import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ChartSkeleton() {
  return (
    <Card className="@container/card animate-pulse">
      <CardHeader>
        <CardTitle>
          <div className="bg-muted-foreground/20 h-6 w-32 rounded"></div>
        </CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">
            <div className="bg-muted-foreground/20 h-4 w-64 rounded"></div>
          </span>
          <span className="@[540px]/card:hidden">
            <div className="bg-muted-foreground/20 h-4 w-24 rounded"></div>
          </span>
        </CardDescription>
        <CardAction>
          {/* Desktop toggle group skeleton */}
          <div className="@[767px]/card:flex hidden gap-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-muted-foreground/20 h-8 w-24 rounded-md"></div>
            ))}
          </div>
          {/* Mobile select skeleton */}
          <div className="@[767px]/card:hidden">
            <SelectTrigger className="flex w-40" disabled aria-label="Select a value">
              <SelectValue>
                <div className="bg-muted-foreground/20 h-4 w-24 rounded"></div>
              </SelectValue>
            </SelectTrigger>
          </div>
        </CardAction>
      </CardHeader>
      <div className="px-2 pb-6 pt-4 sm:px-6 sm:pt-6">
        <div className="bg-muted-foreground/10 relative aspect-auto h-[250px] w-full overflow-hidden rounded-lg">
          {/* Chart bars simulation */}
          <div className="absolute bottom-0 left-0 right-0 flex h-full items-end justify-around p-8">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="bg-muted-foreground/20 w-[12%] rounded-t"
                style={{ height: `${Math.random() * 60 + 20}%` }}
              />
            ))}
          </div>
          {/* Shimmer overlay */}
          <div className="via-muted-foreground/10 absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent to-transparent" />
        </div>
      </div>
    </Card>
  );
}
