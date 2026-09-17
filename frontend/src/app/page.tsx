'use strict';
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

interface HealthData {
  status: string;
  message: string;
  timestamp: string;
  environment: string;
}

export default function Home() {
  const [backendHealth, setBackendHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.checkHealth();
      setBackendHealth(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect to the backend server.');
      setBackendHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl space-y-6">
        
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            CampusFind
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Project Foundation — Phase 1
          </p>
        </div>

        {/* Status Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <span className="text-sm font-medium text-slate-400">Frontend Status</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Running
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <span className="text-sm font-medium text-slate-400">Backend Connectivity</span>
            {loading ? (
              <span className="text-xs text-slate-500">Checking...</span>
            ) : error ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Disconnected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Connected
              </span>
            )}
          </div>
        </div>

        {/* Health Response Data Card */}
        <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 text-xs font-mono space-y-2">
          <div className="flex justify-between items-center text-slate-500 border-b border-slate-800 pb-1 mb-2">
            <span>GET /api/health</span>
            <button 
              onClick={fetchHealth}
              disabled={loading}
              className="hover:text-white transition-colors disabled:opacity-50 text-[10px] uppercase font-bold"
            >
              [Refresh]
            </button>
          </div>

          {loading ? (
            <p className="text-slate-500 animate-pulse">Querying liveness state...</p>
          ) : error ? (
            <div className="text-rose-400">
              <p className="font-bold">Error Connecting:</p>
              <p className="mt-1 break-words">{error}</p>
              <p className="text-[10px] text-slate-500 mt-2">
                Make sure the backend is running at http://localhost:5000
              </p>
            </div>
          ) : (
            backendHealth && (
              <div className="space-y-1 text-slate-300">
                <p><span className="text-slate-500">status:</span> "{backendHealth.status}"</p>
                <p><span className="text-slate-500">message:</span> "{backendHealth.message}"</p>
                <p><span className="text-slate-500">environment:</span> "{backendHealth.environment}"</p>
                <p><span className="text-slate-500">timestamp:</span> "{backendHealth.timestamp}"</p>
              </div>
            )
          )}
        </div>

        <div className="text-center text-[10px] text-slate-600">
          CampusFind is currently under active development.
        </div>
      </div>
    </main>
  );
}
