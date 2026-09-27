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
    <div className="campus-card my-6 space-y-4 p-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--campus-light)] text-2xl text-[var(--campus-navy)]">
        🔍
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-[var(--campus-text)]">{title}</h3>
        <p className="mx-auto max-w-sm text-sm text-[var(--campus-muted)]">{description}</p>
      </div>
      {actionLabel && actionHref && (
        <div className="pt-2">
          <Link href={actionHref} className="campus-button-primary px-4 py-2.5 text-xs">
            {actionLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
