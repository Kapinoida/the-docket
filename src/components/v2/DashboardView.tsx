'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSync } from '@/contexts/SyncContext';
import WeeklyCalendar from './WeeklyCalendar';
import RecentNotes from './RecentNotes';
import DashboardActionCard from './DashboardActionCard';
import {
  getDashboardCounts,
  getTopOverdue,
  getTodayCommitments,
  getGreeting,
} from '@/lib/dashboardPlanning';
import {
  Layout,
  AlertTriangle,
  Inbox as InboxIcon,
  CalendarClock,
  Flag,
  Calendar,
} from 'lucide-react';

export default function DashboardView() {
  const router = useRouter();
  const { tasks, events } = useSync();

  const counts = useMemo(() => getDashboardCounts(tasks, events), [tasks, events]);
  const topOverdue = useMemo(() => getTopOverdue(tasks, 3), [tasks]);
  const commitments = useMemo(() => getTodayCommitments(tasks), [tasks]);
  const greeting = getGreeting();

  const todayTotal = counts.todayTasks + counts.todayEvents;
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handlePageSelect = (page: { id: number }) => {
    router.push(`/page/${page.id}`);
  };

  return (
    <div className="flex-1 px-4 py-6 md:p-8 bg-bg-primary">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-2 md:gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Layout size={20} />
            </div>
            {greeting}
          </h1>
          <p className="text-text-secondary mt-2 ml-14">{dateStr}</p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          <DashboardActionCard
            count={counts.overdue}
            label="Needs attention"
            description="Overdue tasks"
            icon={AlertTriangle}
            iconColor="text-red-600 dark:text-red-400"
            iconBg="bg-red-100 dark:bg-red-900/30"
            countColor="text-red-600 dark:text-red-400"
            href="/tasks"
            emptyMessage="Nothing overdue"
          >
            <div className="space-y-1">
              {topOverdue.map(task => (
                <div key={task.id} className="text-xs text-text-muted truncate">
                  {task.content}
                </div>
              ))}
            </div>
          </DashboardActionCard>

          <DashboardActionCard
            count={counts.inbox}
            label="Needs processing"
            description="Inbox items"
            icon={InboxIcon}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            countColor="text-blue-600 dark:text-blue-400"
            href="/inbox"
            emptyMessage="Inbox is clear"
          />

          <DashboardActionCard
            count={counts.undated}
            label="Needs planning"
            description="Active tasks without a date"
            icon={CalendarClock}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            countColor="text-amber-600 dark:text-amber-400"
            href="/tasks"
            emptyMessage="All tasks are scheduled"
          />

          <DashboardActionCard
            count={todayTotal}
            label="Today"
            description={`${counts.todayTasks} tasks · ${counts.todayEvents} events`}
            icon={Flag}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            countColor="text-purple-600 dark:text-purple-400"
            href="/today"
            emptyMessage="Nothing scheduled today"
          >
            <div className="space-y-1">
              {commitments.must.length > 0 && (
                <div className="text-xs text-text-muted">
                  {commitments.must.length} must · {commitments.should.length} should · {commitments.could.length} could
                </div>
              )}
            </div>
          </DashboardActionCard>
        </div>

        {/* Today's Commitments */}
        {todayTotal > 0 && (
          <div className="bg-bg-secondary rounded-2xl border border-border-subtle shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Flag className="text-purple-500" size={18} />
                Today&apos;s commitments
              </h3>
              <button
                onClick={() => router.push('/today')}
                className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {commitments.must.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wide mb-2">
                    <Flag size={12} /> Must
                  </div>
                  <div className="space-y-1">
                    {commitments.must.map(task => (
                      <div key={task.id} className="flex items-center gap-2 text-sm text-text-primary">
                        <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                        <span className="truncate">{task.content}</span>
                        {task.next_action && (
                          <span className="text-xs text-text-muted truncate ml-auto hidden md:inline">
                            {task.next_action}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {commitments.should.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-wide mb-2">
                    <Flag size={12} /> Should
                  </div>
                  <div className="space-y-1">
                    {commitments.should.map(task => (
                      <div key={task.id} className="flex items-center gap-2 text-sm text-text-primary">
                        <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                        <span className="truncate">{task.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {commitments.could.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-500 uppercase tracking-wide mb-2">
                    <Flag size={12} /> Could
                  </div>
                  <div className="space-y-1">
                    {commitments.could.map(task => (
                      <div key={task.id} className="flex items-center gap-2 text-sm text-text-primary">
                        <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                        <span className="truncate">{task.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {commitments.unassigned.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wide mb-2">
                    <Flag size={12} /> Unassigned
                  </div>
                  <div className="space-y-1">
                    {commitments.unassigned.map(task => (
                      <div key={task.id} className="flex items-center gap-2 text-sm text-text-primary">
                        <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                        <span className="truncate">{task.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 gap-8">
          {/* Weekly Calendar */}
          <div className="bg-bg-secondary rounded-2xl border border-border-subtle shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Calendar className="text-purple-500" size={20} />
                Weekly Schedule
              </h3>
            </div>
            <WeeklyCalendar />
          </div>

          {/* Recent Notes */}
          <div className="bg-bg-secondary rounded-2xl border border-border-subtle shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Layout className="text-blue-500" size={20} />
                Recent Notes
              </h3>
            </div>
            <RecentNotes onNoteSelect={handlePageSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}
