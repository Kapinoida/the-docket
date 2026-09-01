import { Task } from '@/types';
import { Calendar, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { parseLocalDateNode } from '@/lib/dateUtils';

interface OverdueReviewItemProps {
  task: Task;
  onKeepActive: (taskId: number) => void;
  onReschedule: (taskId: number) => void;
  onClarify: (task: Task) => void;
  onDelete: (taskId: number) => void;
  isDismissed?: boolean;
}

export default function OverdueReviewItem({
  task,
  onKeepActive,
  onReschedule,
  onClarify,
  onDelete,
  isDismissed,
}: OverdueReviewItemProps) {
  const dueDate = task.due_date ? parseLocalDateNode(task.due_date) : null;
  const overdueDays = dueDate
    ? Math.floor((new Date().getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  if (isDismissed) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 opacity-60">
        <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-text-muted line-through truncate">{task.content}</div>
          <div className="text-xs text-text-muted">Reviewed</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary">{task.content}</div>
          {task.next_action && (
            <div className="text-xs text-text-muted mt-1">Next: {task.next_action}</div>
          )}
          <div className="text-xs text-red-500 dark:text-red-400 mt-1">
            {overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue
            {dueDate && ` · Due ${dueDate.toLocaleDateString()}`}
          </div>
          {task.page_name && (
            <div className="text-xs text-text-muted mt-0.5">In: {task.page_name}</div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onKeepActive(task.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
        >
          <CheckCircle size={14} />
          Keep active
        </button>
        <button
          onClick={() => onReschedule(task.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Calendar size={14} />
          Reschedule
        </button>
        <button
          onClick={() => onClarify(task)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
        >
          <Edit2 size={14} />
          Clarify
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
}
