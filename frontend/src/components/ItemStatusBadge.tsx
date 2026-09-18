import React from 'react';
import { LostItemStatus, FoundItemStatus } from '@/services/api';

interface ItemStatusBadgeProps {
  status: LostItemStatus | FoundItemStatus | string;
  type?: 'lost' | 'found';
}

export function ItemStatusBadge({ status }: ItemStatusBadgeProps) {
  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';

  switch (status) {
    case 'ACTIVE':
      badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      break;
    case 'MATCHED':
      badgeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      break;
    case 'CLAIM_PENDING':
      badgeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      break;
    case 'FOUND':
    case 'CLAIMED':
    case 'RETURNED':
      badgeStyle = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      break;
    case 'CLOSED':
      badgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      break;
    default:
      badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
  }

  const formattedStatus = status.replace('_', ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle} tracking-wide uppercase`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {formattedStatus}
    </span>
  );
}
