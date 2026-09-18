import React from 'react';
import Link from 'next/link';
import { LostItem, FoundItem } from '@/services/api';
import { ItemStatusBadge } from './ItemStatusBadge';

interface ItemCardProps {
  item: LostItem | FoundItem;
  type: 'lost' | 'found';
}

export function ItemCard({ item, type }: ItemCardProps) {
  const isLost = type === 'lost';
  const itemDate = isLost
    ? (item as LostItem).lostDate
    : (item as FoundItem).foundDate;

  const formattedDate = new Date(itemDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const detailUrl = isLost ? `/lost/${item.id}` : `/found/${item.id}`;

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all hover:translate-y-[-2px] group">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-blue-400 border border-slate-700">
            {item.category}
          </span>
          <ItemStatusBadge status={item.status} type={type} />
        </div>

        {/* Title */}
        <Link href={detailUrl} className="block group-hover:text-blue-400 transition-colors">
          <h3 className="text-lg font-bold text-white line-clamp-1">
            {item.title}
          </h3>
        </Link>

        {/* Description Preview */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {item.description}
        </p>
      </div>

      {/* Metadata & Footer Action */}
      <div className="pt-4 mt-4 border-t border-slate-800/80 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 font-sans">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-slate-500">📍</span>
            <span className="truncate">{item.location}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-slate-500">📅</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        <Link
          href={detailUrl}
          className="w-full py-2 px-3 bg-slate-850 hover:bg-blue-600/10 hover:border-blue-500/30 border border-slate-800 text-slate-300 hover:text-blue-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all"
        >
          <span>View Details</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
