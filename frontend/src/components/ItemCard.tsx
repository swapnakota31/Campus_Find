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
  const image = item.images?.[0]?.signedAccessUrl;

  return (
    <div className="campus-card group flex h-full flex-col justify-between p-4">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-[var(--campus-border)] bg-[var(--campus-light)]">
          {image ? (
            <img
              src={image}
              alt={item.title}
              className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-44 w-full items-center justify-center bg-[linear-gradient(135deg,#edf4ff,#f7f9fc)] text-center text-[var(--campus-muted)]">
              <div>
                <div className="mb-2 text-3xl">📦</div>
                <div className="text-xs font-medium">No image available</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full border border-[rgba(30,90,168,0.16)] bg-[var(--campus-light)] px-2.5 py-1 text-[11px] font-semibold text-[var(--campus-royal)]">
            {item.category}
          </span>
          <ItemStatusBadge status={item.status} type={type} />
        </div>

        <Link href={detailUrl} className="block transition-colors hover:text-[var(--campus-royal)]">
          <h3 className="line-clamp-1 text-lg font-bold text-[var(--campus-text)]">{item.title}</h3>
        </Link>

        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--campus-muted)]">{item.description}</p>
      </div>

      <div className="mt-5 border-t border-[var(--campus-border)] pt-4">
        <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-[var(--campus-muted)]">
          <div className="flex items-center gap-1.5 truncate">
            <span>📍</span>
            <span className="truncate">{item.location}</span>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <span>📅</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        <Link href={detailUrl} className="campus-button-primary w-full px-3 py-2.5 text-xs">
          View Details
        </Link>
      </div>
    </div>
  );
}
