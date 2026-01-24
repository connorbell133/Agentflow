import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function SectionCardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardDescription>
          <div className="bg-muted-foreground/20 h-4 w-24 rounded"></div>
        </CardDescription>
        <CardTitle>
          <div className="bg-muted-foreground/20 h-8 w-16 rounded"></div>
        </CardTitle>
        <CardAction>
          <Badge variant="outline" className="px-3">
            <div className="bg-muted-foreground/20 h-4 w-12 rounded"></div>
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter>
        <div className="flex items-center gap-2">
          <div className="bg-muted-foreground/20 h-4 w-32 rounded"></div>
          <div className="bg-muted-foreground/20 h-4 w-4 rounded"></div>
        </div>
        <div className="bg-muted-foreground/20 mt-1 h-3 w-24 rounded"></div>
      </CardFooter>
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/5" />
    </Card>
  );
}

interface SectionCardsSkeletonProps {
  count?: number;
}

export function SectionCardsSkeleton({ count = 4 }: SectionCardsSkeletonProps) {
  return (
    <div className="@xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <SectionCardSkeleton key={index} />
      ))}
    </div>
  );
}
