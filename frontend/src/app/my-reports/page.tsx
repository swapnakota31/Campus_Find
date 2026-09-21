'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ItemStatusBadge } from '@/components/ItemStatusBadge';
import { api, Claim, FoundItem, LostItem } from '@/services/api';

export default function MyReportsPage() {
  const [lost, setLost] = useState<LostItem[]>([]);
  const [found, setFound] = useState<FoundItem[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { Promise.all([api.getLostItems({ myItems: true, limit: 50 }), api.getFoundItems({ myItems: true, limit: 50 }), api.getMyClaims()]).then(([lostResult, foundResult, claimResult]) => { setLost(lostResult.data); setFound(foundResult.data); setClaims(claimResult.data); }).catch((requestError: any) => setError(requestError.message || 'Unable to load your reports.')).finally(() => setLoading(false)); }, []);
  return <div className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8"><header><h1 className="text-3xl font-extrabold text-white">My reports</h1><p className="text-sm text-slate-400 mt-2">Track reports you submitted and claims you started.</p></header>{loading ? <LoadingState message="Loading your activity..." /> : error ? <ErrorState message={error} /> : <div className="space-y-8"><section><h2 className="text-xl font-bold text-white mb-4">Lost reports</h2>{lost.length === 0 ? <EmptyState title="No lost reports" description="Reports you create will appear here." actionLabel="Report lost item" actionHref="/lost/report" /> : <div className="space-y-2">{lost.map(item => <Link key={item.id} href={`/lost/${item.id}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-blue-500/40"><div><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-slate-400">{item.category} · {item.location}</p></div><ItemStatusBadge status={item.status} type="lost" /></Link>)}</div>}</section><section><h2 className="text-xl font-bold text-white mb-4">Found reports</h2>{found.length === 0 ? <EmptyState title="No found reports" description="Reports you create will appear here." actionLabel="Report found item" actionHref="/found/report" /> : <div className="space-y-2">{found.map(item => <Link key={item.id} href={`/found/${item.id}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-blue-500/40"><div><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-slate-400">{item.category} · {item.location}</p></div><ItemStatusBadge status={item.status} type="found" /></Link>)}</div>}</section><section><h2 className="text-xl font-bold text-white mb-4">My claims</h2>{claims.length === 0 ? <EmptyState title="No claims" description="Claims you start on found items will appear here." actionLabel="Browse found items" actionHref="/found" /> : <div className="space-y-2">{claims.map(claim => <Link key={claim.id} href={`/found/${claim.foundItemId}`} className="block rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-blue-500/40"><p className="font-semibold text-white">{claim.foundItem.title}</p><p className="text-xs text-slate-400 mt-1">{claim.foundItem.category} · Claim {claim.status.replace('_', ' ')}</p></Link>)}</div>}</section></div>}</main></div>;
}