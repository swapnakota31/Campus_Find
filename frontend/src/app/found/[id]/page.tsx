'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { api, Claim, ClaimQuestion, FoundItem } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function FoundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [item, setItem] = useState<FoundItem | null>(null);
  const [myClaim, setMyClaim] = useState<Claim | null>(null);
  const [finderClaims, setFinderClaims] = useState<Claim[]>([]);
  const [isFinder, setIsFinder] = useState(false);
  const [questions, setQuestions] = useState<ClaimQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'APPROVE' | 'REJECT' | 'FINDER_HANDOVER' | 'RECEIPT' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflow = async () => {
    try {
      const itemResult = await api.getFoundItem(id);
      setItem(itemResult.data);
      try {
        setFinderClaims((await api.getFoundItemClaims(id)).data);
        setIsFinder(true);
        setMyClaim(null);
      } catch {
        setIsFinder(false);
        const claims = (await api.getMyClaims()).data;
        setMyClaim(claims.find(claim => claim.foundItemId === id) || null);
      }
    } catch (requestError: any) {
      setError(requestError.message || 'Unable to load found item.');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (id) loadWorkflow(); }, [id, user?.id]);

  const startClaim = async () => {
    setActionLoading(true); setError(null);
    try {
      const result = await api.createClaim(id); setMyClaim(result.data);
      const questionResult = await api.getClaimQuestions(result.data.id); setQuestions(questionResult.data);
      setMessage('Claim started. Answer the private verification questions below.');
    } catch (requestError: any) { setError(requestError.message || 'Unable to start claim.'); }
    finally { setActionLoading(false); }
  };

  const loadClaimQuestions = async (claim: Claim) => {
    setMyClaim(claim);
    if (claim.status === 'PENDING') setQuestions((await api.getClaimQuestions(claim.id)).data);
  };

  const submitAnswers = async () => {
    if (!myClaim || questions.some(question => !answers[question.id]?.trim())) return;
    setActionLoading(true); setError(null);
    try {
      const result = await api.verifyClaim(myClaim.id, questions.map(question => ({ questionId: question.id, answer: answers[question.id] })));
      setMessage(result.data.verified ? 'Verification passed and is pending review.' : `Verification result: ${result.data.status}.`);
      await loadWorkflow();
    } catch (requestError: any) { setError(requestError.message || 'Unable to submit verification.'); }
    finally { setActionLoading(false); }
  };

  const performAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true); setError(null);
    try {
      if (confirmAction === 'APPROVE' && finderClaims[0]) await api.approveFinderClaim(finderClaims[0].id);
      if (confirmAction === 'REJECT' && finderClaims[0]) await api.rejectFinderClaim(finderClaims[0].id, 'Rejected during finder review.');
      if (confirmAction === 'FINDER_HANDOVER' && reviewClaim) await api.confirmFinderHandover(reviewClaim.id);
      if (confirmAction === 'RECEIPT' && myClaim) await api.confirmClaimantReceipt(myClaim.id);
      setConfirmAction(null); setMessage('Workflow update saved.'); await loadWorkflow();
    } catch (requestError: any) { setError(requestError.message || 'Unable to save workflow update.'); }
    finally { setActionLoading(false); }
  };

  if (loading) return <LoadingState message="Loading found item workflow..." />;
  if (error && !item) return <><Navbar /><ErrorState message={error} /></>;
  if (!item) return null;
  const finder = isFinder;
  const reviewClaim = finder ? finderClaims[0] : null;
  const claimForParticipant = myClaim;
  const handover = claimForParticipant?.handover;

  return <div className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4"><span className="text-xs text-emerald-300">{item.category}</span><h1 className="text-3xl font-extrabold text-white">{item.title}</h1><p className="text-slate-300 leading-relaxed">{item.description}</p><div className="grid grid-cols-2 text-xs text-slate-400"><span>Location: {item.location}</span><span>Date: {new Date(item.foundDate).toLocaleDateString()}</span></div>{!finder && !myClaim && item.status === 'ACTIVE' && <button disabled={actionLoading} onClick={startClaim} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{actionLoading ? 'Starting claim...' : 'This may be mine'}</button>}</section>
    {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">{message}</div>}{error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}
    {finder && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4"><h2 className="text-xl font-bold text-white">Claim review</h2>{!reviewClaim ? <p className="text-sm text-slate-400">No claims have been submitted for this found item.</p> : <><div className="flex items-center justify-between"><div><p className="text-sm text-white">Claim {reviewClaim.id}</p><p className="text-xs text-slate-400 mt-1">Status: {reviewClaim.status.replace('_', ' ')}</p></div><div className="flex gap-2">{reviewClaim.status === 'UNDER_REVIEW' && <><button onClick={() => setConfirmAction('REJECT')} className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300">Reject</button><button onClick={() => setConfirmAction('APPROVE')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Approve</button></>}{reviewClaim.status === 'APPROVED' && reviewClaim.handover?.status !== 'COMPLETED' && !reviewClaim.handover?.finderConfirmed && <button onClick={() => setConfirmAction('FINDER_HANDOVER')} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950">Confirm handover</button>}</div></div></>}</section>}
    {claimForParticipant && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5"><div><h2 className="text-xl font-bold text-white">My claim</h2><p className="text-sm text-slate-400 mt-1">Status: {claimForParticipant.status.replace('_', ' ')}</p></div>{claimForParticipant.status === 'PENDING' && questions.length === 0 && <button onClick={() => loadClaimQuestions(claimForParticipant)} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Open verification</button>}{questions.length > 0 && claimForParticipant.status === 'PENDING' && <div className="space-y-4">{questions.map(question => <label key={question.id} className="block text-sm text-slate-300">{question.questionText}<input value={answers[question.id] || ''} onChange={event => setAnswers(current => ({ ...current, [question.id]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-white" /></label>)}<button disabled={actionLoading || questions.some(question => !answers[question.id]?.trim())} onClick={submitAnswers} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Submit verification</button></div>}{claimForParticipant.status === 'APPROVED' && handover?.status !== 'COMPLETED' && <div className="space-y-3"><p className="text-sm text-amber-300">Handover pending. Finder confirmed: {handover?.finderConfirmed ? 'yes' : 'no'}.</p>{handover?.finderConfirmed && !handover.claimantConfirmed && <button onClick={() => setConfirmAction('RECEIPT')} className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950">Confirm receipt</button>}</div>}{handover?.status === 'COMPLETED' && <p className="font-semibold text-emerald-300">Recovery completed. The item is marked returned.</p>}</section>}
  </main><ConfirmDialog isOpen={confirmAction !== null} title={confirmAction === 'REJECT' ? 'Reject this claim?' : confirmAction === 'APPROVE' ? 'Approve this claim?' : confirmAction === 'RECEIPT' ? 'Confirm receipt?' : 'Confirm handover?'} message="This is a controlled workflow action and cannot be reversed from this screen." confirmLabel="Confirm" cancelLabel="Cancel" isDangerous={confirmAction === 'REJECT'} loading={actionLoading} onConfirm={performAction} onCancel={() => setConfirmAction(null)} /></div>;
}
