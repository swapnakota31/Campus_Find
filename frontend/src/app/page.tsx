'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ItemCard } from '@/components/ItemCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { api, LostItem, FoundItem } from '@/services/api';

const campusLocations = [
  'Main Block',
  'N Block',
  'P Block',
  'Canteen',
  'Library',
  'Shed A',
  'Shed B',
  'Shed C',
  'Shed D',
  'A2 Seminar Hall',
  'A4 Seminar Hall',
  'Amenities Block',
];

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
    <div className="min-h-screen flex flex-col bg-[var(--campus-bg)] text-[var(--campus-text)]">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="campus-banner overflow-hidden rounded-[28px] border border-white/10 p-8 text-white shadow-[var(--campus-shadow)] sm:p-10 lg:p-12">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-100">
              Campus Lost & Found Portal
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Lost something on campus?
              <span className="mt-2 block text-[var(--campus-yellow)]">Found something that belongs to someone?</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">
              CampusFind helps students report missing items, identify found belongings, and securely coordinate returns across campus.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/lost/report" className="campus-button-primary px-6 py-3.5 text-sm">
                Report Lost Item
              </Link>
              <Link href="/found/report" className="campus-button-secondary px-6 py-3.5 text-sm">
                Report Found Item
              </Link>
            </div>
          </div>

          <div className="mt-8 grid max-w-lg grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-[rgba(15,31,57,0.18)] p-4 backdrop-blur-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-3xl font-black text-[var(--campus-yellow)]">{lostTotal}</div>
              <div className="mt-1 text-xs text-blue-100">Lost reports</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-3xl font-black text-[var(--campus-yellow)]">{foundTotal}</div>
              <div className="mt-1 text-xs text-blue-100">Found reports</div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--campus-royal)]">Campus Locations</p>
              <h2 className="mt-2 text-2xl font-black text-[var(--campus-text)]">Popular campus touchpoints</h2>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {campusLocations.map((location) => (
              <div key={location} className="campus-card group p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--campus-light)] text-lg text-[var(--campus-royal)]">📍</div>
                    <p className="text-base font-bold text-[var(--campus-text)]">{location}</p>
                  </div>
                  <span className="rounded-full bg-[var(--campus-light)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--campus-royal)]">
                    Campus
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {loading ? (
          <LoadingState message="Fetching recent campus reports..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDashboardData} />
        ) : (
          <div className="space-y-12">
            <section className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--campus-royal)]">Recent reports</p>
                  <h2 className="mt-2 text-2xl font-black text-[var(--campus-text)]">Recent lost items</h2>
                </div>
                <Link href="/lost" className="text-sm font-semibold text-[var(--campus-royal)] hover:text-[var(--campus-navy)]">
                  View all ({lostTotal})
                </Link>
              </div>

              {recentLost.length === 0 ? (
                <EmptyState title="No lost items reported yet" description="Great news! There are currently no active lost item reports on campus." actionLabel="Report a Lost Item" actionHref="/lost/report" />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {recentLost.map((item) => (
                    <ItemCard key={item.id} item={item} type="lost" />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--campus-royal)]">Recent reports</p>
                  <h2 className="mt-2 text-2xl font-black text-[var(--campus-text)]">Recent found items</h2>
                </div>
                <Link href="/found" className="text-sm font-semibold text-[var(--campus-royal)] hover:text-[var(--campus-navy)]">
                  View all ({foundTotal})
                </Link>
              </div>

              {recentFound.length === 0 ? (
                <EmptyState title="No found items reported yet" description="Found an item on campus? Report it to help return it to its owner." actionLabel="Report a Found Item" actionHref="/found/report" />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {recentFound.map((item) => (
                    <ItemCard key={item.id} item={item} type="found" />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--campus-border)] bg-white/60 py-6 text-center text-xs text-[var(--campus-muted)]">
        CampusFind — Secure & privacy-first student lost & found platform
      </footer>
    </div>
  );
}
