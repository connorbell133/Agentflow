import { cn } from '@/utils/shared/cn';

interface TypingIndicatorProps {
  className?: string;
  dotClassName?: string;
}

const TypingIndicator = ({ className, dotClassName }: TypingIndicatorProps) => (
  <div className={cn('flex items-center space-x-1', className)}>
    <div
      className={cn('h-2 w-2 rounded-full bg-muted-foreground', dotClassName)}
      style={{
        animation: 'typing-bounce 1.4s infinite ease-in-out',
        animationDelay: '0s',
      }}
    />
    <div
      className={cn('h-2 w-2 rounded-full bg-muted-foreground', dotClassName)}
      style={{
        animation: 'typing-bounce 1.4s infinite ease-in-out',
        animationDelay: '0.2s',
      }}
    />
    <div
      className={cn('h-2 w-2 rounded-full bg-muted-foreground', dotClassName)}
      style={{
        animation: 'typing-bounce 1.4s infinite ease-in-out',
        animationDelay: '0.4s',
      }}
    />
  </div>
);

export default TypingIndicator;
export { TypingIndicator };
