'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RecordingSchedule, ConflictPair } from '@/types';
import RecordingCard from './RecordingCard';
import ConflictPanel from './ConflictPanel';
import TimelineView from './TimelineView';
import Filters from './Filters';
import DashboardSkeleton from './DashboardSkeleton';
import EmptyState from './EmptyState';
import { RefreshCw, Radio, AlertTriangle, Clock } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function RecordingDashboard() {
  const [recordings, setRecordings] = useState<RecordingSchedule[]>([]);
  const [conflicts, setConflicts] = useState<ConflictPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recordingsError, setRecordingsError] = useState<string | null>(null);
  const [conflictsError, setConflictsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetchIdRef = useRef(0);

  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [leagueFilter, setLeagueFilter] = useState<string | undefined>();
  const [dateRangeFilter, setDateRangeFilter] = useState<string | undefined>();

  const fetchData = useCallback(async (isRefresh = false) => {
    const currentFetch = ++fetchIdRef.current;

    if (isRefresh) {
      setRefreshing(true);
    }

    setRecordingsError(null);
    setConflictsError(null);

    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (leagueFilter) params.set('league', leagueFilter);
    if (dateRangeFilter) params.set('dateRange', dateRangeFilter);

    try {
      const recordingsData = await apiFetch<RecordingSchedule[]>(
        `/api/v2/recordings?${params.toString()}`
      );
      if (currentFetch !== fetchIdRef.current) return;
      setRecordings(recordingsData);
    } catch (err) {
      if (currentFetch !== fetchIdRef.current) return;
      setRecordingsError(err instanceof Error ? err.message : 'Failed to load recordings');
    }

    try {
      const conflictsData = await apiFetch<ConflictPair[]>('/api/v2/recordings/conflicts');
      if (currentFetch !== fetchIdRef.current) return;
      setConflicts(conflictsData);
    } catch (err) {
      if (currentFetch !== fetchIdRef.current) return;
      setConflictsError(err instanceof Error ? err.message : 'Failed to load conflicts');
    }

    if (currentFetch === fetchIdRef.current) {
      setLastUpdated(new Date());
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, leagueFilter, dateRangeFilter]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60000);
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
  const failedCount = recordings.filter((r) => r.status === 'failed').length;

  if (loading && recordings.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary md:text-2xl">
            Recordings
          </h2>
          {lastUpdated && (
            <p className="mt-0.5 text-xs text-text-muted">
              Last synced {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex min-h-[44px] items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
          aria-label="Refresh recordings"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        <div className="rounded-lg border border-border-default bg-bg-secondary p-3 md:p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10">
              <Clock className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-xs text-text-muted">Upcoming</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-text-primary">{upcomingCount}</p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-secondary p-3 md:p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500/10">
              <Radio className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-xs text-text-muted">Recording</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-green-400">{recordingNowCount}</p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-secondary p-3 md:p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-xs text-text-muted">Conflicts</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-400">{conflicts.length}</p>
        </div>
        <div className="rounded-lg border border-border-default bg-bg-secondary p-3 md:p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-xs text-text-muted">Failed</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-400">{failedCount}</p>
        </div>
      </div>

      {conflictsError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-400">
          Could not load conflicts: {conflictsError}
        </div>
      )}

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

      {recordingsError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
          {recordingsError}
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
