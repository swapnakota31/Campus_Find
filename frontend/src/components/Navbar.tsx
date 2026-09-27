'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/lost', label: 'Lost Items' },
    { href: '/found', label: 'Found Items' },
    { href: '/my-reports', label: 'My Reports' },
    { href: '/notifications', label: 'Notifications' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[var(--campus-deep)] text-white backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-sm font-black text-[var(--campus-yellow)] shadow-lg shadow-[rgba(244,196,0,0.18)] transition-transform group-hover:scale-105">
                CF
              </div>
              <div className="leading-none">
                <div className="text-lg font-black tracking-tight text-white">
                  Campus<span className="text-[var(--campus-yellow)]">Find</span>
                </div>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    active ? 'bg-white/10 text-white' : 'text-blue-100 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {active && <span className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-[var(--campus-yellow)]" />}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            {user ? (
              <div className="flex items-center gap-3">
                {user.role === 'ADMIN' && (
                  <Link href="/admin/matches" className="rounded-lg border border-[rgba(244,196,0,0.35)] bg-[rgba(244,196,0,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--campus-yellow)] transition-colors hover:bg-[rgba(244,196,0,0.14)]">
                    Match Review
                  </Link>
                )}
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-blue-100">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="max-w-[180px] truncate">{user.collegeEmail}</span>
                </div>
                <button
                  onClick={logout}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-blue-100 transition-colors hover:border-rose-300/50 hover:bg-rose-500/10 hover:text-rose-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="campus-button-primary px-4 py-2.5 text-sm">
                Sign In
              </Link>
            )}
          </div>

          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-blue-100 hover:bg-white/5"
              aria-label="Toggle navigation"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-[var(--campus-deep)] px-4 pb-4 pt-3 md:hidden">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-xl px-3 py-2 text-base font-medium ${
                  active ? 'bg-white/10 text-white' : 'text-blue-100 hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {user && (
            <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
              {user.role === 'ADMIN' && (
                <Link href="/admin/matches" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg border border-[rgba(244,196,0,0.35)] bg-[rgba(244,196,0,0.08)] px-3 py-2 text-sm font-semibold text-[var(--campus-yellow)]">
                  Match Review
                </Link>
              )}
              <button onClick={() => { setMobileMenuOpen(false); logout(); }} className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-blue-100">
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
