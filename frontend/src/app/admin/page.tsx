'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/LoadingState';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace(user?.role === 'ADMIN' ? '/admin/matches' : '/');
  }, [loading, router, user]);

  return <LoadingState message="Opening admin review..." />;
}