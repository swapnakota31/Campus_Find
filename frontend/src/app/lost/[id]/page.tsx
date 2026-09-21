'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { api, LostItem } from '@/services/api';

export default function LostDetailPage() { const { id } = useParams<{ id: string }>(); const [item, setItem] = useState<LostItem | null>(null); const [error, setError] = useState<string | null>(null); useEffect(() => { api.getLostItem(id).then(result => setItem(result.data)).catch((requestError: any) => setError(requestError.message || 'Unable to load item.')); }, [id]); if (error) return <><Navbar /><ErrorState message={error} /></>; if (!item) return <LoadingState message="Loading lost item..." />; return <div className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><main className="max-w-3xl mx-auto px-4 py-8"><section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4"><span className="text-xs text-rose-300">{item.category}</span><h1 className="text-3xl font-extrabold text-white">{item.title}</h1><p className="text-slate-300 leading-relaxed">{item.description}</p><div className="grid grid-cols-2 text-xs text-slate-400"><span>Location: {item.location}</span><span>Date: {new Date(item.lostDate).toLocaleDateString()}</span></div></section></main></div>; }