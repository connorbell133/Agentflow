"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { getDashboardData } from '@/actions/admin/getDashboardData';

interface DashboardStats {
  userCount: number;
  groupCount: number;
  modelCount: number;
  conversationCount: number;
}

interface DashboardContextValue {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

interface DashboardProviderProps {
  children: React.ReactNode;
  org_id: string;
  initialStats?: DashboardStats;
}

export function DashboardProvider({ children, org_id, initialStats }: DashboardProviderProps) {
  const [stats, setStats] = useState<DashboardStats | null>(initialStats || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(initialStats ? Date.now() : 0); // Mark as fetched if we have initial data

  const refetch = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchInProgress.current) return;

    // Rate limit: don't fetch more than once per minute
    const now = Date.now();
    if (now - lastFetchTime.current < 60000) {
      console.log('Skipping dashboard refetch - rate limited');
      return;
    }

    fetchInProgress.current = true;
    lastFetchTime.current = now;
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching dashboard data for org:', org_id);
      const data = await getDashboardData(org_id);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [org_id]);

  // Don't auto-fetch on mount since we always have initial stats
  // This prevents duplicate fetches
  useEffect(() => {
    if (!initialStats && !stats && !fetchInProgress.current) {
      console.log('No initial stats provided, fetching...');
      refetch();
    }
  }, [initialStats, stats, refetch]); // Empty deps to run only once on mount

  return (
    <DashboardContext.Provider value={{ stats, loading, error, refetch }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardStats() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardStats must be used within DashboardProvider');
  }
  return context;
}