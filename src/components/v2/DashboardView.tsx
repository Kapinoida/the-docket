'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSync } from '@/contexts/SyncContext';
import { useTaskEdit } from '@/contexts/TaskEditContext';
import WeeklyCalendar from './WeeklyCalendar';
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
  Plus,
  CheckSquare,
  ClipboardCheck,
} from 'lucide-react';

export default function DashboardView() {
  const router = useRouter();
  const { tasks, events, initialLoading, isFetching } = useSync();
  const { openTaskEdit } = useTaskEdit();

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

  return (
    <div className="flex-1 px-4 py-6 md:p-8 bg-bg-primary overflow-y-auto">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Layout size={20} />
              </div>
              {greeting}
            </h1>
            {isFetching && !initialLoading && (
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                <span>Updating...</span>
              </div>
            )}
          </div>
          <p className="text-text-secondary mt-2 ml-14">{dateStr}</p>
        </div>

        {initialLoading ? (
          /* Loading Skeleton */
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-bg-secondary rounded-2xl border border-border-subtle shadow-sm p-4 md:p-5 animate-pulse">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-bg-tertiary rounded-lg" />
                      <div className="space-y-2">
                        <div className="w-24 h-4 bg-bg-tertiary rounded" />
                        <div className="w-16 h-3 bg-bg-tertiary rounded" />
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-bg-tertiary rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-bg-secondary rounded-2xl border border-border-subtle shadow-sm p-6 animate-pulse">
              <div className="w-48 h-6 bg-bg-tertiary rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-full h-4 bg-bg-tertiary rounded" />
                ))}
              </div>
            </div>
            <div className="bg-bg-secondary rounded-2xl border border-border-subtle shadow-sm p-6 animate-pulse">
              <div className="w-40 h-6 bg-bg-tertiary rounded mb-4" />
              <div className="h-48 bg-bg-tertiary rounded" />
            </div>
          </div>
        ) : (
          <>
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
                    <button
                      key={task.id}
                      onClick={(e) => { e.preventDefault(); openTaskEdit(task); }}
                      className="w-full text-left text-xs text-text-muted truncate hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1 -mx-1"
                      aria-label={`Edit overdue task: ${task.content}`}
                    >
                      {task.content}
                    </button>
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

            {/* Quick Actions */}
            <div className="bg-bg-secondary rounded-2xl border border-border-subtle shadow-sm p-4 md:p-5 mb-8">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <CheckSquare className="text-indigo-500" size={16} />
                Quick actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => router.push('/inbox')}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label="Process inbox"
                >
                  <InboxIcon size={16} />
                  Process Inbox
                </button>
                <button
                  onClick={() => router.push('/today')}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  aria-label="Open today view"
                >
                  <Flag size={16} />
                  Today
                </button>
                <button
                  onClick={() => router.push('/review')}
                  className="flex items-center gap-2 px-3 py-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  aria-label="Start weekly review"
                >
                  <ClipboardCheck size={16} />
                  Weekly Review
                </button>
                <button
                  onClick={() => router.push('/tasks')}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  aria-label="View all tasks"
                >
                  <CheckSquare size={16} />
                  All Tasks
                </button>
              </div>
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
                    className="text-sm text-blue-500 hover:text-blue-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
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
                          <button
                            key={task.id}
                            onClick={() => openTaskEdit(task)}
                            className="w-full flex items-center gap-2 text-sm text-text-primary text-left hover:bg-bg-tertiary rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            aria-label={`Edit must-do task: ${task.content}`}
                          >
                            <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                            <span className="truncate">{task.content}</span>
                            {task.next_action && (
                              <span className="text-xs text-text-muted truncate ml-auto hidden md:inline">
                                {task.next_action}
                              </span>
                            )}
                          </button>
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
                          <button
                            key={task.id}
                            onClick={() => openTaskEdit(task)}
                            className="w-full flex items-center gap-2 text-sm text-text-primary text-left hover:bg-bg-tertiary rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            aria-label={`Edit should-do task: ${task.content}`}
                          >
                            <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                            <span className="truncate">{task.content}</span>
                          </button>
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
                          <button
                            key={task.id}
                            onClick={() => openTaskEdit(task)}
                            className="w-full flex items-center gap-2 text-sm text-text-primary text-left hover:bg-bg-tertiary rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            aria-label={`Edit could-do task: ${task.content}`}
                          >
                            <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                            <span className="truncate">{task.content}</span>
                          </button>
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
                          <button
                            key={task.id}
                            onClick={() => openTaskEdit(task)}
                            className="w-full flex items-center gap-2 text-sm text-text-primary text-left hover:bg-bg-tertiary rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            aria-label={`Edit task: ${task.content}`}
                          >
                            <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                            <span className="truncate">{task.content}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

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
          </>
        )}
      </div>
    </div>
  );
}
