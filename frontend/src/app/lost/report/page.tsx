'use client';

import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ReportForm } from '@/components/ReportForm';

export default function ReportLostPage() { return <div className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><main className="max-w-3xl mx-auto px-4 py-8 space-y-6"><Link href="/lost" className="text-xs text-blue-400">← Back to lost items</Link><div><h1 className="text-3xl font-extrabold text-white">Report a lost item</h1><p className="text-sm text-slate-400 mt-2">Share safe report details. Uploaded images remain private.</p></div><ReportForm type="lost" /></main></div>; }