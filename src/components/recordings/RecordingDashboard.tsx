'use client';

import { useState, useEffect, useCallback } from 'react';
import { RecordingSchedule, ConflictPair } from '@/types';
import RecordingCard from './RecordingCard';
import ConflictPanel from './ConflictPanel';
import TimelineView from './TimelineView';
import Filters from './Filters';
import DashboardSkeleton from './DashboardSkeleton';
import EmptyState from './EmptyState';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function RecordingDashboard() {
  const [recordings, setRecordings] = useState<RecordingSchedule[]>([]);
  const [conflicts, setConflicts] = useState<ConflictPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [leagueFilter, setLeagueFilter] = useState<string | undefined>();
  const [dateRangeFilter, setDateRangeFilter] = useState<string | undefined>();

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (leagueFilter) params.set('league', leagueFilter);
      if (dateRangeFilter) params.set('dateRange', dateRangeFilter);

      const [recordingsData, conflictsData] = await Promise.all([
        apiFetch<RecordingSchedule[]>(`/api/v2/recordings?${params.toString()}`),
        apiFetch<ConflictPair[]>('/api/v2/recordings/conflicts'),
      ]);

      setRecordings(recordingsData);
      setConflicts(conflictsData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, leagueFilter, dateRangeFilter]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const todayRecordings = recordings.filter((r) => {
    const start = new Date(r.start_time);
    const today = new Date();
    return start.toDateString() === today.toDateString();
  });

  const upcomingCount = recordings.filter((r) => {
    const start = new Date(r.start_time);
    return start > new Date() && ['pending', 'scheduled'].includes(r.status);
  }).length;

  const recordingNowCount = recordings.filter((r) => r.status === 'recording').length;

  if (loading && recordings.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-text-primary md:text-2xl">
          Dashboard
        </h2>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-text-muted">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex min-h-[44px] items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="rounded-lg border border-border-default bg-bg-secondary p-3 md:p-4">
          <p className="text-xs text-text-muted md:text-sm">Upcoming</p>
          <p className="mt-1 text-xl font-bold text-text-primary md:text-2xl">{upcomingCount}</p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-secondary p-3 md:p-4">
          <p className="text-xs text-text-muted md:text-sm">Recording</p>
          <p className="mt-1 text-xl font-bold text-green-400 md:text-2xl">{recordingNowCount}</p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-secondary p-3 md:p-4">
          <p className="text-xs text-text-muted md:text-sm">Conflicts</p>
          <p className="mt-1 text-xl font-bold text-red-400 md:text-2xl">{conflicts.length}</p>
        </div>
      </div>

      {conflicts.length > 0 && <ConflictPanel conflicts={conflicts} />}

      <TimelineView recordings={todayRecordings} />

      <div>
        <h3 className="mb-3 text-sm font-medium text-text-primary">All Recordings</h3>
        <Filters
          status={statusFilter}
          league={leagueFilter}
          dateRange={dateRangeFilter}
          onStatusChange={setStatusFilter}
          onLeagueChange={setLeagueFilter}
          onDateRangeChange={setDateRangeFilter}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {recordings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {recordings.map((recording) => (
            <RecordingCard key={recording.id} recording={recording} />
          ))}
        </div>
      )}
    </div>
  );
}
