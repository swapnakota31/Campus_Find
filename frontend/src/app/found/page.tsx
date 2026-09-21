'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { SearchBar } from '@/components/SearchBar';
import { ItemCard } from '@/components/ItemCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { api, FoundItem, PaginationMeta } from '@/services/api';

export default function FoundItemsPage() {
  const [items, setItems] = useState<FoundItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await api.getFoundItems({ search, category, status, page, limit: 12 });
      setItems(result.data || []); if (result.pagination) setPagination(result.pagination);
    } catch (requestError: any) { setError(requestError.message || 'Unable to load found reports.'); }
    finally { setLoading(false); }
  }, [category, page, search, status]);

  useEffect(() => { load(); }, [load]);

  return <div className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6"><div><h1 className="text-3xl font-extrabold text-white">Found items</h1><p className="text-sm text-slate-400 mt-2">Browse active reports and start a private ownership verification claim.</p></div><Link href="/found/report" className="rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white hover:bg-emerald-500">Report found item</Link></header>
    <SearchBar search={search} category={category} status={status} statusOptions={['ACTIVE', 'CLAIM_PENDING', 'CLAIMED', 'RETURNED', 'CLOSED']} onSearchChange={value => { setSearch(value); setPage(1); }} onCategoryChange={value => { setCategory(value); setPage(1); }} onStatusChange={value => { setStatus(value); setPage(1); }} onReset={() => { setSearch(''); setCategory(''); setStatus(''); setPage(1); }} />
    {loading ? <LoadingState message="Searching found reports..." /> : error ? <ErrorState message={error} onRetry={load} /> : items.length === 0 ? <EmptyState title="No found items found" description="Try a different search or report an item you found." actionLabel="Report found item" actionHref="/found/report" /> : <><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{items.map(item => <ItemCard key={item.id} item={item} type="found" />)}</div>{pagination.totalPages > 1 && <div className="flex justify-between border-t border-slate-800 pt-4 text-xs text-slate-400"><span>Page {pagination.page} of {pagination.totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-800 px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-800 px-3 py-2 disabled:opacity-40">Next</button></div></div>}</>}
  </main></div>;
}