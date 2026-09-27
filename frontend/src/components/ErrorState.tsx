import React from 'react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Unable to load reports. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="campus-card mx-auto my-8 max-w-md space-y-4 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-xl font-bold text-rose-600">
        !
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-[var(--campus-text)]">Something went wrong</h3>
        <p className="text-xs text-[var(--campus-muted)]">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="campus-button-primary px-4 py-2.5 text-xs"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
