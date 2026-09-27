import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading reports...' }: LoadingStateProps) {
  return (
    <div className="campus-card flex flex-col items-center justify-center p-12 text-center">
      <div className="relative h-12 w-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--campus-border)] border-t-[var(--campus-medium)]"></div>
      </div>
      <p className="mt-4 text-sm font-medium text-[var(--campus-muted)]">{message}</p>
    </div>
  );
}
