import { Loader2, AlertCircle } from 'lucide-react';

interface LoadingStateProps {
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  loadingText?: string;
  retry?: () => void;
}

/**
 * Enhanced loading state component with error handling
 */
export function LoadingState({
  loading,
  error,
  children,
  loadingText = 'Laden...',
  retry,
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{loadingText}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-900 dark:text-red-100">{error}</p>
            {retry && (
              <button
                onClick={retry}
                className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline mt-2"
              >
                Opnieuw proberen
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Skeleton loading component for lists
 */
export function SkeletonLoader({ count = 3, height = 'h-12' }: { count?: number; height?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} rounded-lg bg-muted animate-pulse`}
        />
      ))}
    </div>
  );
}

/**
 * Circular progress indicator
 */
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return <Loader2 className={`${sizes[size]} animate-spin text-primary`} />;
}

/**
 * Loading overlay for dialogs
 */
export function LoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3 bg-card p-6 rounded-lg">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground">Bezig...</p>
      </div>
    </div>
  );
}
