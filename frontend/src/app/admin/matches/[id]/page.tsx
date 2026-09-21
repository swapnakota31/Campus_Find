'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { AdminMatchDetail, api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const score = (value: number | null) => value === null ? 'Unavailable' : value.toFixed(3);

type ReviewItemData = AdminMatchDetail['lostItem'] | AdminMatchDetail['foundItem'];

function ReviewItem({ label, item, date }: { label: string; item: ReviewItemData; date: string }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</h2>
        <span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-400">{item.status}</span>
      </div>
      <div>
        <h3 className="text-xl font-bold text-white">{item.title}</h3>
        <p className="text-sm text-blue-300 mt-1">{item.category}</p>
      </div>
      <p className="text-sm leading-relaxed text-slate-300">{item.description}</p>
      <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
        <span>Location: <strong className="text-slate-200">{item.location}</strong></span>
        <span>Date: <strong className="text-slate-200">{new Date(date).toLocaleDateString()}</strong></span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {item.images.length === 0 ? <div className="col-span-2 rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">No private images available.</div> : item.images.map(image => (
          <div key={image.id} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.signedAccessUrl} alt={`${label} private review`} className="aspect-square w-full object-cover" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminMatchDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [match, setMatch] = useState<AdminMatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);

  const loadMatch = async () => {
    setLoading(true);
    setError(null);
    try {
      setMatch((await api.getAdminMatch(params.id)).data);
    } catch (requestError: any) {
      setError(requestError.message || 'Unable to load match details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    if (user?.role === 'ADMIN' && params.id) loadMatch();
  }, [authLoading, params.id, router, user]);

  const decide = async () => {
    if (!decision) return;
    setDecisionLoading(true);
    try {
      const response = decision === 'APPROVE'
        ? await api.approveAdminMatch(params.id)
        : await api.rejectAdminMatch(params.id, 'Dismissed during administrator review.');
      setMatch(current => current ? {
        ...current,
        id: response.data.id,
        lostItemId: response.data.lostItemId,
        foundItemId: response.data.foundItemId,
        textScore: response.data.textScore,
        imageScore: response.data.imageScore,
        metadataScore: response.data.metadataScore,
        overallScore: response.data.overallScore,
        status: response.data.status,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt,
      } : current);
      setDecision(null);
    } catch (requestError: any) {
      setError(requestError.message || 'Unable to save the match decision.');
    } finally {
      setDecisionLoading(false);
    }
  };

  if (authLoading || loading) return <LoadingState message="Loading match review..." />;
  if (user?.role !== 'ADMIN') return null;
  if (error && !match) return <><Navbar /><ErrorState message={error} onRetry={loadMatch} /></>;
  if (!match) return null;

  const isPotential = match.status === 'POTENTIAL';
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link href="/admin/matches" className="text-xs font-semibold text-blue-400 hover:text-blue-300">← Back to match queue</Link>
            <h1 className="text-3xl font-extrabold text-white mt-3">Match review</h1>
            <p className="text-xs text-slate-500 mt-1 font-mono break-all">{match.id}</p>
          </div>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300">{match.status}</span>
        </div>

        {error && <ErrorState message={error} onRetry={loadMatch} />}

        <div className="grid gap-6 lg:grid-cols-2">
          <ReviewItem label="Lost item" item={match.lostItem} date={match.lostItem.lostDate} />
          <ReviewItem label="Found item" item={match.foundItem} date={match.foundItem.foundDate} />
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Match analysis</p><p className="text-sm text-slate-400 mt-2">Similarity signals support review; they do not prove ownership.</p></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Image similarity', match.imageScore],
              ['Metadata similarity', match.metadataScore],
              ['Text similarity', match.textScore],
              ['Overall similarity', match.overallScore],
            ].map(([label, value]) => <div key={label as string} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs text-slate-500">{label as string}</p><p className="text-xl font-mono font-bold text-blue-300 mt-2">{score(value as number | null)}</p></div>)}
          </div>
          {isPotential && <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-slate-800 pt-5"><button onClick={() => setDecision('REJECT')} className="rounded-xl border border-rose-500/30 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/10">Reject match</button><button onClick={() => setDecision('APPROVE')} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">Approve match</button></div>}
        </section>
      </main>
      <ConfirmDialog isOpen={decision !== null} title={`${decision === 'APPROVE' ? 'Approve' : 'Reject'} this match?`} message="This records an administrator decision on the similarity match. It will not approve ownership, create a claim, or complete a handover." confirmLabel={decision === 'APPROVE' ? 'Approve match' : 'Reject match'} cancelLabel="Keep reviewing" isDangerous={decision === 'REJECT'} loading={decisionLoading} onConfirm={decide} onCancel={() => setDecision(null)} />
    </div>
  );
}