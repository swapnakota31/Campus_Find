'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ItemCard } from '@/components/ItemCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { api, LostItem, FoundItem } from '@/services/api';

export default function StudentDashboard() {
  const [recentLost, setRecentLost] = useState<LostItem[]>([]);
  const [recentFound, setRecentFound] = useState<FoundItem[]>([]);
  const [lostTotal, setLostTotal] = useState<number>(0);
  const [foundTotal, setFoundTotal] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lostRes, foundRes] = await Promise.all([
        api.getLostItems({ limit: 4 }),
        api.getFoundItems({ limit: 4 }),
      ]);

      if (lostRes.data) {
        setRecentLost(lostRes.data);
        setLostTotal(lostRes.pagination?.total || lostRes.data.length);
      }
      if (foundRes.data) {
        setRecentFound(foundRes.data);
        setFoundTotal(foundRes.pagination?.total || foundRes.data.length);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load campus dashboard items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            🎓 Campus Lost & Found Hub
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight max-w-3xl mx-auto leading-tight">
            Lost something? Found something?
            <span className="block text-blue-400 mt-2">Let&apos;s help it get back to its owner.</span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            CampusFind is the secure, privacy-first platform connecting students who lost belongings with finders across campus.
          </p>

          {/* Prominent Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/lost/report"
              className="w-full sm:w-auto px-6 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-rose-600/20 transition-all transform hover:-translate-y-0.5"
            >
              🔍 Report Lost Item
            </Link>
            <Link
              href="/found/report"
              className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-emerald-600/20 transition-all transform hover:-translate-y-0.5"
            >
              📦 Report Found Item
            </Link>
          </div>

          {/* Quick Statistics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-2 max-w-md mx-auto gap-4 pt-6 border-t border-slate-800/80">
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
              <span className="text-2xl font-bold text-rose-400 block">{lostTotal}</span>
              <span className="text-xs text-slate-400 font-medium">Active Lost Reports</span>
            </div>
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
              <span className="text-2xl font-bold text-emerald-400 block">{foundTotal}</span>
              <span className="text-xs text-slate-400 font-medium">Active Found Reports</span>
            </div>
          </div>
        </section>

        {loading ? (
          <LoadingState message="Fetching recent campus reports..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDashboardData} />
        ) : (
          <div className="space-y-12">
            {/* Recent Lost Items Section */}
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>Recent Lost Reports</span>
                  </h2>
                  <p className="text-xs text-slate-400">Belongings recently reported missing by students</p>
                </div>
                <Link
                  href="/lost"
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <span>View All Lost Items ({lostTotal})</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {recentLost.length === 0 ? (
                <EmptyState
                  title="No lost items reported yet"
                  description="Great news! There are currently no active lost item reports on campus."
                  actionLabel="Report a Lost Item"
                  actionHref="/lost/report"
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {recentLost.map((item) => (
                    <ItemCard key={item.id} item={item} type="lost" />
                  ))}
                </div>
              )}
            </section>

            {/* Recent Found Items Section */}
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>Recent Found Reports</span>
                  </h2>
                  <p className="text-xs text-slate-400">Items turned in or spotted around campus</p>
                </div>
                <Link
                  href="/found"
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <span>View All Found Items ({foundTotal})</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {recentFound.length === 0 ? (
                <EmptyState
                  title="No found items reported yet"
                  description="Found an item on campus? Report it to help return it to its owner."
                  actionLabel="Report a Found Item"
                  actionHref="/found/report"
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {recentFound.map((item) => (
                    <ItemCard key={item.id} item={item} type="found" />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        CampusFind — Secure & Privacy-First Student Lost & Found Platform
      </footer>
    </div>
  );
}
