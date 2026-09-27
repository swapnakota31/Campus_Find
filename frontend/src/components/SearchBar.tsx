'use client';

import React from 'react';
import { CATEGORIES } from '@/services/api';

interface SearchBarProps {
  search: string;
  category: string;
  status: string;
  statusOptions?: string[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onReset: () => void;
}

export function SearchBar({
  search,
  category,
  status,
  statusOptions = ['ACTIVE', 'MATCHED', 'FOUND', 'CLAIM_PENDING', 'CLAIMED', 'RETURNED', 'CLOSED'],
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onReset,
}: SearchBarProps) {
  const isFiltered = search || category || status;

  return (
    <div className="campus-card space-y-3 p-4 md:flex md:items-center md:gap-3 md:space-y-0">
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--campus-muted)]">
          🔍
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by title, description, or location..."
          className="w-full rounded-xl border border-[var(--campus-border)] bg-[var(--campus-bg)] py-2.5 pl-10 pr-4 text-xs text-[var(--campus-text)] placeholder:text-[var(--campus-muted)] focus:border-[var(--campus-royal)] focus:outline-none focus:ring-2 focus:ring-[rgba(30,90,168,0.12)] sm:text-sm"
        />
      </div>

      <div className="w-full md:w-48">
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--campus-border)] bg-[var(--campus-bg)] px-3 py-2.5 text-xs text-[var(--campus-text)] focus:border-[var(--campus-royal)] focus:outline-none focus:ring-2 focus:ring-[rgba(30,90,168,0.12)] sm:text-sm"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full md:w-40">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--campus-border)] bg-[var(--campus-bg)] px-3 py-2.5 text-xs text-[var(--campus-text)] focus:border-[var(--campus-royal)] focus:outline-none focus:ring-2 focus:ring-[rgba(30,90,168,0.12)] sm:text-sm"
        >
          <option value="">All Statuses</option>
          {statusOptions.map((st) => (
            <option key={st} value={st}>
              {st.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {isFiltered && (
        <button
          onClick={onReset}
          className="w-full whitespace-nowrap rounded-xl border border-[var(--campus-border)] bg-[var(--campus-light)] px-4 py-2.5 text-xs font-medium text-[var(--campus-navy)] transition-colors hover:bg-[var(--campus-white)] md:w-auto"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
