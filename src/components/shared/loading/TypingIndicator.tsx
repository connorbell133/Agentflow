import { cn } from '@/utils/cn';

interface TypingIndicatorProps {
    className?: string;
    dotClassName?: string;
}

const TypingIndicator = ({ className, dotClassName }: TypingIndicatorProps) => (
    <div className={cn('flex space-x-1 items-center', className)}>
        <div
            className={cn(
                'w-2 h-2 bg-muted-foreground rounded-full',
                dotClassName
            )}
            style={{
                animation: 'typing-bounce 1.4s infinite ease-in-out',
                animationDelay: '0s'
            }}
        />
        <div
            className={cn(
                'w-2 h-2 bg-muted-foreground rounded-full',
                dotClassName
            )}
            style={{
                animation: 'typing-bounce 1.4s infinite ease-in-out',
                animationDelay: '0.2s'
            }}
        />
        <div
            className={cn(
                'w-2 h-2 bg-muted-foreground rounded-full',
                dotClassName
            )}
            style={{
                animation: 'typing-bounce 1.4s infinite ease-in-out',
                animationDelay: '0.4s'
            }}
        />
    </div>
);

export default TypingIndicator;
export { TypingIndicator };
