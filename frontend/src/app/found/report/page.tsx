'use client';

import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ReportForm } from '@/components/ReportForm';

export default function ReportFoundPage() { return <div className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><main className="max-w-3xl mx-auto px-4 py-8 space-y-6"><Link href="/found" className="text-xs text-blue-400">← Back to found items</Link><div><h1 className="text-3xl font-extrabold text-white">Report a found item</h1><p className="text-sm text-slate-400 mt-2">Keep distinctive details private for later verification.</p></div><ReportForm type="found" /></main></div>; }