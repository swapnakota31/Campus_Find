'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { AdminMatch, api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const score = (value: number | null) => value === null ? 'Unavailable' : value.toFixed(3);

export default function AdminMatchesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getAdminMatches();
      setMatches(response.data);
    } catch (requestError: any) {
      setError(requestError.message || 'Unable to load potential matches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    if (user?.role === 'ADMIN') loadMatches();
  }, [authLoading, router, user]);

  if (authLoading || (loading && !error)) return <LoadingState message="Loading potential matches..." />;
  if (user?.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Admin Review</p>
            <h1 className="text-3xl font-extrabold text-white mt-2">Potential matches</h1>
            <p className="text-sm text-slate-400 mt-2">Similarity signals for human review. These scores are not ownership certainty.</p>
          </div>
          <span className="text-xs text-slate-500">{matches.length} potential {matches.length === 1 ? 'match' : 'matches'}</span>
        </header>

        {error ? <ErrorState message={error} onRetry={loadMatches} /> : matches.length === 0 ? (
          <EmptyState title="No potential matches" description="New server-generated similarity matches will appear here for review." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Reports</th>
                  <th className="px-5 py-4">Image similarity</th>
                  <th className="px-5 py-4">Metadata</th>
                  <th className="px-5 py-4">Text</th>
                  <th className="px-5 py-4">Overall similarity</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {matches.map(match => (
                  <tr key={match.id} className="hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{match.lostItem.title}</div>
                      <div className="text-xs text-rose-300">Lost · {match.lostItem.category}</div>
                      <div className="font-semibold text-white mt-2">{match.foundItem.title}</div>
                      <div className="text-xs text-emerald-300">Found · {match.foundItem.category}</div>
                      <div className="text-[11px] text-slate-600 mt-2">{match.id}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-300">{score(match.imageScore)}</td>
                    <td className="px-5 py-4 font-mono text-slate-300">{score(match.metadataScore)}</td>
                    <td className="px-5 py-4 font-mono text-slate-300">{score(match.textScore)}</td>
                    <td className="px-5 py-4 font-mono font-bold text-blue-300">{score(match.overallScore)}</td>
                    <td className="px-5 py-4"><span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">{match.status}</span></td>
                    <td className="px-5 py-4"><Link href={`/admin/matches/${match.id}`} className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500">Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}