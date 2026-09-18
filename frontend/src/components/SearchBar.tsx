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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3 md:space-y-0 md:flex md:items-center md:gap-3">
      {/* Text Search Input */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
          🔍
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by title, description, or location..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Category Dropdown Filter */}
      <div className="w-full md:w-48">
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Status Dropdown Filter */}
      <div className="w-full md:w-40">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        >
          <option value="">All Statuses</option>
          {statusOptions.map((st) => (
            <option key={st} value={st}>
              {st.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Filter Button */}
      {isFiltered && (
        <button
          onClick={onReset}
          className="w-full md:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-xl transition-all border border-slate-700 whitespace-nowrap"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
