import React, { useState } from 'react';
import { CheckCircle2, Circle, Calendar, Clock, Edit2 } from 'lucide-react';
import { Task } from '../../types/v2';
import { format } from 'date-fns';
import { DatePickerPopover } from './DatePickerPopover';
import { useTaskEdit } from '../../contexts/TaskEditContext';

interface TaskItemProps {
  task: Task;
  onToggle: (id: number) => void;
  onUpdate?: (updates: Partial<Task>) => void;
  isSelectionEnabled?: boolean;
  isSelected?: boolean;
  onSelect?: (id: number, selected: boolean) => void;
  showContext?: boolean;
  extraActions?: React.ReactNode;
}

export const TaskItem: React.FC<TaskItemProps> = ({ 
    task, onToggle, onUpdate, isSelectionEnabled, isSelected, onSelect, showContext = true, extraActions
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(task.content);
  const { openTaskEdit } = useTaskEdit();

  const handleDateSelect = (date: Date | null, recurrence?: any) => {
      onUpdate?.({ 
          due_date: date,
          recurrence_rule: recurrence?.type !== 'none' ? recurrence : null
      });
  };

  const handleBlur = () => {
      setIsEditing(false);
      if (editContent !== task.content) {
          onUpdate?.({ content: editContent });
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          (e.currentTarget as HTMLInputElement).blur();
      }
  };

  const handleEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      // Adapt V2 task to V1 expected by context
      openTaskEdit({
          ...task,
          id: task.id.toString(),
          dueDate: task.due_date ? new Date(task.due_date) : null,
          completed: task.status === 'done',
          createdAt: new Date(task.created_at),
          updatedAt: new Date(task.updated_at),
          content: task.content,
          recurrenceRule: task.recurrence_rule
      } as any);
  };

  return (
    <div className={`group flex items-start gap-1.5 py-0.5 transition-all duration-200 relative ${isSelected ? 'bg-purple-50/50 dark:bg-purple-900/10 rounded-lg -mx-2 px-2' : ''}`}>
      
      {/* Selection Checkbox */}
      {(onSelect || isSelectionEnabled) && (
          <div className={`mt-1.5 flex-shrink-0 transition-opacity ${isSelected || isSelectionEnabled ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <input 
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onSelect?.(task.id, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
          </div>
      )}

      {/* Completion Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className="mt-1 flex-shrink-0 transition-colors text-text-muted hover:text-accent-green select-none"
      >
        {task.status === 'done' ? (
             <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={2} />
        ) : (
             <Circle className="w-5 h-5" strokeWidth={2} />
        )}
      </button>

      {/* Metadata / Date Badge - Now on Left */}
      <div className="flex-shrink-0 flex items-center justify-center mt-1" style={{ width: task.due_date ? 'auto' : '24px' }}>
             {(task.due_date || showDatePicker) ? (
                <div className="relative">
                    <button 
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={`
                            flex items-center justify-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors whitespace-nowrap
                            ${task.status === 'done' ? 'text-text-muted border-transparent' : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 border-transparent hover:border-rose-100 dark:hover:border-rose-800'}
                            ${!task.due_date ? 'text-text-muted border-border-default border-dashed' : ''}
                        `}
                    >
                        {task.due_date ? (
                             <span className="font-mono font-medium">{format(new Date(task.due_date), 'MMM d')}</span>
                        ) : (
                             <Calendar size={12} />
                        )}
                        {task.recurrence_rule && <Clock size={10} className="ml-0.5" />}
                    </button>

                    {showDatePicker && (
                        <DatePickerPopover 
                            date={task.due_date ? new Date(task.due_date) : null}
                            recurrenceRule={task.recurrence_rule}
                            onSelect={handleDateSelect}
                            onClose={() => setShowDatePicker(false)}
                            position={{ top: 25, left: 0 }}
                        />
                    )}
                </div>
             ) : (
                 /* Implicit Add Button */
                 <button 
                    onClick={() => setShowDatePicker(true)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-secondary transition-opacity p-1"
                    title="Add Due Date"
                 >
                     <Calendar size={14} />
                 </button>
             )}
      </div>

      {/* Content Area (Simple Input/Div for Dashboard) */}
      <div className="flex-1 min-w-0 py-0.5">
          {onUpdate ? (
              <input
                  value={isEditing ? editContent : task.content}
                  onChange={(e) => setEditContent(e.target.value)}
                  onFocus={() => setIsEditing(true)}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  className={`
                      w-full bg-transparent border-none outline-none text-sm leading-relaxed py-0
                      ${task.status === 'done' ? 'line-through text-text-muted' : 'text-text-primary'}
                  `}
              />
          ) : (
              <div className={`text-sm leading-relaxed py-0 text-text-primary break-words ${task.status === 'done' ? 'line-through text-text-muted' : ''}`}>
                  {task.content}
              </div>
          )}
      </div>

      {/* Context Badge */}
      {showContext && (
        <div className="flex-shrink-0 flex items-center ml-2">
            {task.context ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-text-secondary border border-border-default max-w-[150px] truncate" title={`From: ${task.context.title}`}>
                {task.context.title}
                </span>
            ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 dark:bg-gray-800/50 text-text-muted border border-transparent">
                Inbox
                </span>
            )}
        </div>
      )}

      {/* Edit Trigger - Only visible on hover */}
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button
            onClick={handleEdit}
            className="p-1 text-text-muted hover:text-blue-500 transition-all"
            title="Edit Task"
        >
            <Edit2 size={14} />
        </button>
        {extraActions}
      </div>

    </div>
  );
};
