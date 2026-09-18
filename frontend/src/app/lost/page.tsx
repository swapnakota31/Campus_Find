'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { SearchBar } from '@/components/SearchBar';
import { ItemCard } from '@/components/ItemCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { api, LostItem, PaginationMeta } from '@/services/api';

export default function LostItemsPage() {
  const [items, setItems] = useState<LostItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLostItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLostItems({
        search,
        category,
        status,
        page,
        limit: 12,
      });

      if (res.data) {
        setItems(res.data);
      }
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to fetch lost item reports.');
    } finally {
      setLoading(false);
    }
  }, [search, category, status, page]);

  useEffect(() => {
    fetchLostItems();
  }, [fetchLostItems]);

  const handleReset = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Title & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Lost Items Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Browse all items reported lost across campus or filter by category and location.
            </p>
          </div>

          <Link
            href="/lost/report"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all self-start sm:self-auto"
          >
            + Report Lost Item
          </Link>
        </div>

        {/* Filter Bar */}
        <SearchBar
          search={search}
          category={category}
          status={status}
          statusOptions={['ACTIVE', 'MATCHED', 'FOUND', 'CLOSED']}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          onCategoryChange={(val) => { setCategory(val); setPage(1); }}
          onStatusChange={(val) => { setStatus(val); setPage(1); }}
          onReset={handleReset}
        />

        {/* Main Content Area */}
        {loading ? (
          <LoadingState message="Searching lost item reports..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLostItems} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No matching lost items found"
            description="Try changing your search terms or filters, or submit a new report."
            actionLabel="Report a Lost Item"
            actionHref="/lost/report"
          />
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} type="lost" />
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-850 text-xs">
                <span className="text-slate-400">
                  Showing page <span className="font-bold text-slate-200">{pagination.page}</span> of{' '}
                  <span className="font-bold text-slate-200">{pagination.totalPages}</span> ({pagination.total} total)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 font-medium rounded-lg border border-slate-800 transition-all"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 font-medium rounded-lg border border-slate-800 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
