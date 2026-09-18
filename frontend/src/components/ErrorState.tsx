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
    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center space-y-4 max-w-md mx-auto my-8">
      <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
        !
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-rose-200">Something went wrong</h3>
        <p className="text-xs text-rose-300/80">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-xl transition-all shadow-md"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
