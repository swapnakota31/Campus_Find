import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  title = 'No reports found',
  description = 'There are currently no items matching your criteria.',
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-4 my-6 bg-slate-900/40">
      <div className="w-16 h-16 bg-slate-800/60 text-slate-500 rounded-full flex items-center justify-center mx-auto text-2xl">
        🔍
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-slate-200">{title}</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">{description}</p>
      </div>
      {actionLabel && actionHref && (
        <div className="pt-2">
          <Link
            href={actionHref}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/20"
          >
            {actionLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
