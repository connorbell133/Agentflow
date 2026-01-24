import { Button, ButtonProps } from '@/components/ui/button';
import LoadingSpinner from '@/components/common/loading/LoadingSpinner';
import { cn } from '@/utils/shared/cn';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

const LoadingButton = ({
  children,
  loading = false,
  loadingText,
  disabled,
  className,
  ...props
}: LoadingButtonProps) => {
  return (
    <Button {...props} disabled={disabled || loading} className={cn(className)}>
      {loading && <LoadingSpinner size="sm" className="mr-2" />}
      {loading ? loadingText || 'Loading...' : children}
    </Button>
  );
};

export default LoadingButton;
