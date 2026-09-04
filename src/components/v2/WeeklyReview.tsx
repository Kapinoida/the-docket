'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Task } from '@/types';
import { CalendarEvent } from '@/lib/calendar';
import { useSync } from '@/contexts/SyncContext';
import { useTaskEdit } from '@/contexts/TaskEditContext';
import { useToast } from '@/contexts/ToastContext';
import { apiFetch, AuthError } from '@/lib/api';
import {
  getReviewSummary,
  getWeekRange,
  getTaskAgeDays,
} from '@/lib/weeklyReview';
import ReviewSection from './ReviewSection';
import OverdueReviewItem from './OverdueReviewItem';
import { DatePickerPopover } from './DatePickerPopover';
import { EventCard } from '@/components/calendar/EventCard';
import { CalendarTaskCard } from '@/components/calendar/CalendarTaskCard';
import EventDetailModal from '@/components/modals/EventDetailModal';
import {
  ClipboardCheck,
  Inbox as InboxIcon,
  AlertTriangle,
  Calendar,
  Flag,
  Clock,
  Pause,
  Cloud,
  Brain,
} from 'lucide-react';
import type { DecisionRecord } from '@/lib/decisionPlanning';
import { isDecisionOverdueForRevisit, isDecisionDueToday } from '@/lib/decisionPlanning';

export default function WeeklyReview() {
  const router = useRouter();
  const { tasks, events, initialLoading, updateLocalTask, removeLocalTask, refetch } = useSync();
  const { openTaskEdit } = useTaskEdit();
  const { showToast } = useToast();

  const summary = useMemo(() => getReviewSummary(tasks, events), [tasks, events]);
  const weekRange = getWeekRange();

  const [dismissedOverdue, setDismissedOverdue] = useState<Set<number>>(new Set());
  const [rescheduleTaskId, setRescheduleTaskId] = useState<number | null>(null);
  const rescheduleButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [closeoutOutcomes, setCloseoutOutcomes] = useState(['', '', '']);
  const [isSavingCloseout, setIsSavingCloseout] = useState(false);
  const [closeoutSaved, setCloseoutSaved] = useState(false);

  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [decisionsLoading, setDecisionsLoading] = useState(true);

  const fetchDecisions = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setDecisionsLoading(true);
    try {
      const data = await apiFetch('/api/v2/decisions?limit=10') as DecisionRecord[];
      setDecisions(data);
    } catch (error) {
      if (!(error instanceof AuthError)) {
        console.error('Failed to fetch decisions:', error);
      }
    } finally {
      setDecisionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  const totalLooseEnds =
    summary.looseEnds.inbox.length +
    summary.looseEnds.undated.length +
    summary.looseEnds.withoutContext.length +
    summary.looseEnds.withoutNextAction.length;

  const handleKeepActive = useCallback((taskId: number) => {
    setDismissedOverdue(prev => new Set(prev).add(taskId));
  }, []);

  const handleReschedule = useCallback((taskId: number) => {
    setRescheduleTaskId(taskId);
  }, []);

  const handleRescheduleSelect = useCallback(async (date: Date | null) => {
    if (!rescheduleTaskId) return;
    setRescheduleTaskId(null);

    try {
      const updates: Partial<Task> = {
        due_date: date ? date.toISOString() : null,
      };
      updateLocalTask(rescheduleTaskId, updates);
      await apiFetch(`/api/v2/tasks/${rescheduleTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { taskId: rescheduleTaskId, source: 'weeklyReview' } }));
      setDismissedOverdue(prev => new Set(prev).add(rescheduleTaskId));
    } catch (error) {
      if (error instanceof AuthError) return;
      showToast('Failed to reschedule task', 'error');
      refetch();
    }
  }, [rescheduleTaskId, updateLocalTask, refetch, showToast]);

  const handleClarify = useCallback((task: Task) => {
    openTaskEdit(task);
  }, [openTaskEdit]);

  const handleDelete = useCallback(async (taskId: number) => {
    removeLocalTask(taskId);
    try {
      await apiFetch(`/api/v2/tasks/${taskId}`, { method: 'DELETE' });
      window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { taskId, source: 'weeklyReview' } }));
      setDismissedOverdue(prev => new Set(prev).add(taskId));
    } catch (error) {
      if (error instanceof AuthError) return;
      showToast('Failed to delete task', 'error');
      refetch();
    }
  }, [removeLocalTask, refetch, showToast]);

  const handleSaveCloseout = useCallback(async () => {
    const filledOutcomes = closeoutOutcomes.filter(o => o.trim());
    if (filledOutcomes.length === 0) {
      showToast('Add at least one outcome', 'error');
      return;
    }

    setIsSavingCloseout(true);
    try {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: `Weekly Review — ${weekRange.label}` }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Outcomes that matter most this week:' }],
          },
          ...filledOutcomes.map(outcome => ({
            type: 'bulletList',
            content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: outcome }] }] }],
          })),
        ],
      };

      await apiFetch('/api/v2/weekly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      setCloseoutSaved(true);
      showToast('Weekly review saved to journal', 'success');
    } catch (error) {
      if (error instanceof AuthError) return;
      showToast('Failed to save weekly review', 'error');
    } finally {
      setIsSavingCloseout(false);
    }
  }, [closeoutOutcomes, weekRange.label, showToast]);

  if (initialLoading && tasks.length === 0 && events.length === 0) {
    return (
      <div className="flex-1 px-4 py-6 md:p-8 bg-bg-primary">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-bg-tertiary rounded w-48" />
          <div className="h-32 bg-bg-tertiary rounded" />
          <div className="h-32 bg-bg-tertiary rounded" />
          <div className="h-32 bg-bg-tertiary rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 py-6 md:p-8 bg-bg-primary overflow-y-auto">
      <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-2 md:gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
              <ClipboardCheck size={20} />
            </div>
            Weekly Review
          </h1>
          <p className="text-text-secondary mt-2 ml-14">{weekRange.label}</p>
        </div>

        {/* Loose Ends */}
        <ReviewSection
          title="Loose ends"
          icon={InboxIcon}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          count={totalLooseEnds}
          emptyMessage="Everything is sorted"
          action={
            summary.looseEnds.inbox.length > 0 ? (
              <button onClick={() => router.push('/inbox')} className="text-xs text-blue-500 hover:text-blue-600">
                Process inbox →
              </button>
            ) : undefined
          }
        >
          <div className="space-y-3">
            {summary.looseEnds.inbox.length > 0 && (
              <div>
                <div className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-1">
                  Inbox ({summary.looseEnds.inbox.length})
                </div>
                <div className="text-sm text-text-muted">
                  {summary.looseEnds.inbox.slice(0, 3).map(t => t.content).join(', ')}
                  {summary.looseEnds.inbox.length > 3 && ` +${summary.looseEnds.inbox.length - 3} more`}
                </div>
              </div>
            )}
            {summary.looseEnds.undated.length > 0 && (
              <div>
                <div className="text-xs font-bold text-amber-500 uppercase tracking-wide mb-1">
                  Undated ({summary.looseEnds.undated.length})
                </div>
                <div className="text-sm text-text-muted">
                  {summary.looseEnds.undated.slice(0, 3).map(t => t.content).join(', ')}
                  {summary.looseEnds.undated.length > 3 && ` +${summary.looseEnds.undated.length - 3} more`}
                </div>
              </div>
            )}
            {summary.looseEnds.withoutContext.length > 0 && (
              <div>
                <div className="text-xs font-bold text-purple-500 uppercase tracking-wide mb-1">
                  No page context ({summary.looseEnds.withoutContext.length})
                </div>
              </div>
            )}
            {summary.looseEnds.withoutNextAction.length > 0 && (
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  No next action ({summary.looseEnds.withoutNextAction.length})
                </div>
              </div>
            )}
          </div>
        </ReviewSection>

        {/* Stale Items */}
        <ReviewSection
          title="Stale items"
          icon={Clock}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          count={summary.staleTasks.length}
          emptyMessage="Nothing stale"
          action={
            summary.staleTasks.length > 0 ? (
              <button onClick={() => router.push('/tasks')} className="text-xs text-amber-500 hover:text-amber-600">
                View all tasks →
              </button>
            ) : undefined
          }
        >
          <div className="space-y-2">
            {summary.staleTasks.slice(0, 5).map(task => (
              <button
                key={task.id}
                onClick={() => openTaskEdit(task)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-left hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">{task.content}</div>
                  <div className="text-xs text-text-muted">
                    Last updated {getTaskAgeDays(task)} days ago
                    {task.page_name && ` · ${task.page_name}`}
                  </div>
                </div>
              </button>
            ))}
            {summary.staleTasks.length > 5 && (
              <div className="text-xs text-text-muted text-center py-2">
                +{summary.staleTasks.length - 5} more stale tasks
              </div>
            )}
          </div>
        </ReviewSection>

        {/* Overdue Decisions */}
        <ReviewSection
          title="Overdue decisions"
          icon={AlertTriangle}
          iconColor="text-red-600 dark:text-red-400"
          iconBg="bg-red-100 dark:bg-red-900/30"
          count={summary.overdueTasks.length}
          emptyMessage="Nothing overdue"
        >
          <div className="space-y-3">
            {summary.overdueTasks.map(task => (
              <OverdueReviewItem
                key={task.id}
                task={task}
                onKeepActive={handleKeepActive}
                onReschedule={handleReschedule}
                onClarify={handleClarify}
                onDelete={handleDelete}
                isDismissed={dismissedOverdue.has(task.id)}
              />
            ))}
          </div>
        </ReviewSection>

        {/* Waiting For */}
        <ReviewSection
          title="Waiting for"
          icon={Pause}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          count={summary.waitingTasks.length}
          emptyMessage="Nothing waiting"
        >
          <div className="space-y-2">
            {summary.waitingTasks.map(task => {
              const waitingDays = task.waiting_since ? getTaskAgeDays({ ...task, updated_at: task.waiting_since }) : 0;
              const followUpPast = task.follow_up_date && new Date(task.follow_up_date) < new Date();
              return (
                <button
                  key={task.id}
                  onClick={() => openTaskEdit(task)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-left hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{task.content}</div>
                    <div className="text-xs text-text-muted flex flex-wrap gap-x-3 gap-y-1">
                      {task.waiting_on && <span>Waiting on: {task.waiting_on}</span>}
                      {waitingDays > 0 && <span>{waitingDays}d waiting</span>}
                      {task.follow_up_date && (
                        <span className={followUpPast ? 'text-red-500 font-medium' : ''}>
                          Follow up: {new Date(task.follow_up_date).toLocaleDateString()}
                          {followUpPast && ' (past due)'}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ReviewSection>

        {/* Decision Records */}
        <ReviewSection
          title="Decision records"
          icon={Brain}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-100 dark:bg-indigo-900/30"
          count={decisions.length}
          emptyMessage="No decisions recorded"
          action={
            decisions.length > 0 ? (
              <span className="text-xs text-text-muted flex gap-2">
                {decisions.filter(d => isDecisionOverdueForRevisit(d)).length > 0 && (
                  <span className="text-red-500 font-medium">
                    {decisions.filter(d => isDecisionOverdueForRevisit(d)).length} overdue revisit
                  </span>
                )}
                {decisions.filter(d => (d.structured_criteria?.filter(c => !c.task_id).length || 0) > 0).length > 0 && (
                  <span className="text-orange-500 font-medium">
                    {decisions.reduce((sum, d) => sum + (d.structured_criteria?.filter(c => !c.task_id).length || 0), 0)} unresolved
                  </span>
                )}
              </span>
            ) : undefined
          }
        >
          {decisionsLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-12 bg-bg-tertiary rounded" />
              <div className="h-12 bg-bg-tertiary rounded" />
            </div>
          ) : (
            <div className="space-y-2">
              {decisions.slice(0, 5).map(decision => {
                const overdue = isDecisionOverdueForRevisit(decision);
                const dueToday = isDecisionDueToday(decision);
                const unresolvedCount = decision.structured_criteria?.filter(c => !c.task_id).length || 0;
                return (
                  <button
                    key={decision.id}
                    onClick={() => router.push(`/page/${decision.page_id}`)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left hover:shadow-sm transition-shadow ${
                      overdue
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                        : dueToday
                          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'
                          : 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {decision.title || 'Untitled Decision'}
                      </div>
                      <div className="text-xs text-text-muted flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          decision.status === 'decided'
                            ? 'text-emerald-500 bg-emerald-500/10'
                            : decision.status === 'reconsideration'
                              ? 'text-amber-500 bg-amber-500/10'
                              : 'text-blue-500 bg-blue-500/10'
                        }`}>
                          {decision.status}
                        </span>
                        {decision.choice && (
                          <span className="truncate max-w-[200px]">Choice: {decision.choice}</span>
                        )}
                        {decision.revisit_date && (
                          <span className={overdue ? 'text-red-500 font-medium' : dueToday ? 'text-amber-500 font-medium' : ''}>
                            Revisit: {new Date(decision.revisit_date).toLocaleDateString()}
                            {overdue && ' (overdue)'}
                            {dueToday && !overdue && ' (today)'}
                          </span>
                        )}
                        {unresolvedCount > 0 && (
                          <span className="text-orange-500 font-medium">
                            {unresolvedCount} unresolved criteria
                          </span>
                        )}
                        <span className="text-text-muted/60">{decision.page_title}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {decisions.length > 5 && (
                <div className="text-xs text-text-muted text-center py-2">
                  +{decisions.length - 5} more decisions
                </div>
              )}
            </div>
          )}
        </ReviewSection>

        {/* Someday */}
        <ReviewSection
          title="Someday"
          icon={Cloud}
          iconColor="text-gray-500 dark:text-gray-400"
          iconBg="bg-gray-100 dark:bg-gray-800"
          count={summary.somedayTasks.length}
          emptyMessage="No someday tasks"
          action={
            summary.somedayTasks.length > 0 ? (
              <button onClick={() => router.push('/tasks')} className="text-xs text-gray-500 hover:text-gray-600">
                View in tasks →
              </button>
            ) : undefined
          }
        >
          <div className="space-y-2">
            {summary.somedayTasks.slice(0, 5).map(task => (
              <button
                key={task.id}
                onClick={() => openTaskEdit(task)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 text-left hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">{task.content}</div>
                  {task.next_action && (
                    <div className="text-xs text-text-muted mt-0.5">Next: {task.next_action}</div>
                  )}
                </div>
              </button>
            ))}
            {summary.somedayTasks.length > 5 && (
              <div className="text-xs text-text-muted text-center py-2">
                +{summary.somedayTasks.length - 5} more someday tasks
              </div>
            )}
          </div>
        </ReviewSection>

        {/* Reschedule Date Picker */}
        {rescheduleTaskId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setRescheduleTaskId(null)}>
            <div className="relative" onClick={e => e.stopPropagation()}>
              <DatePickerPopover
                date={null}
                onSelect={handleRescheduleSelect}
                onClose={() => setRescheduleTaskId(null)}
                triggerRef={rescheduleButtonRef}
              />
            </div>
          </div>
        )}

        {/* Calendar Look-Ahead */}
        <ReviewSection
          title="Next 14 days"
          icon={Calendar}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          count={summary.lookaheadEvents.length + summary.lookaheadTasks.length}
          emptyMessage="Nothing scheduled"
          action={
            <button onClick={() => router.push('/calendar')} className="text-xs text-purple-500 hover:text-purple-600">
              Open calendar →
            </button>
          }
        >
          <div className="space-y-2">
            {summary.lookaheadEvents.map(event => (
              <EventCard key={`evt-${event.id}`} event={event} onClick={() => setSelectedEvent(event)} />
            ))}
            {summary.lookaheadTasks.map(task => (
              <CalendarTaskCard key={task.id} task={task} onToggle={() => {}} onClick={() => openTaskEdit(task)} />
            ))}
          </div>
        </ReviewSection>

        <EventDetailModal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          event={selectedEvent}
        />

        {/* Review Closeout */}
        <ReviewSection
          title="Review closeout"
          icon={Flag}
          iconColor="text-teal-600 dark:text-teal-400"
          iconBg="bg-teal-100 dark:bg-teal-900/30"
          count={closeoutOutcomes.filter(o => o.trim()).length}
          emptyMessage={closeoutSaved ? 'Saved to journal' : undefined}
          alwaysShowChildren
        >
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              What are the three outcomes that matter most this week?
            </p>
            {closeoutOutcomes.map((outcome, idx) => (
              <input
                key={idx}
                type="text"
                value={outcome}
                onChange={e => {
                  const newOutcomes = [...closeoutOutcomes];
                  newOutcomes[idx] = e.target.value;
                  setCloseoutOutcomes(newOutcomes);
                  setCloseoutSaved(false);
                }}
                placeholder={`Outcome ${idx + 1}`}
                className="w-full px-4 py-2 bg-bg-primary border border-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm text-text-primary placeholder:text-text-muted"
              />
            ))}
            <button
              onClick={handleSaveCloseout}
              disabled={isSavingCloseout || closeoutOutcomes.every(o => !o.trim())}
              className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              {isSavingCloseout ? 'Saving...' : closeoutSaved ? 'Saved to journal' : 'Save to journal'}
            </button>
          </div>
        </ReviewSection>
      </div>
    </div>
  );
}
