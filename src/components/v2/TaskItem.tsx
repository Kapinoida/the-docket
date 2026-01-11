import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Calendar, Clock } from 'lucide-react';
import { Task } from '../../types/v2';
import { format } from 'date-fns';
import { parseTaskDate } from '../../lib/taskParser';
import { DatePickerPopover } from './DatePickerPopover';

interface TaskItemProps {
  task: Task;
  onToggle: (id: number) => void;
  onUpdate?: (updates: Partial<Task>) => void;
  onEnter?: (isEmpty: boolean) => void;
  onBackspace?: () => void;
  autoFocus?: boolean;
  extraActions?: React.ReactNode;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onUpdate, onEnter, onBackspace, autoFocus, extraActions }) => {
  const [content, setContent] = useState(task.content);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Keep local content in sync
  useEffect(() => {
    setContent(task.content);
  }, [task.content]);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setContent(newVal);
    onUpdate?.({ content: newVal });

    // Natural Language Parsing
    // Look for @pattern or ending with @pattern
    const match = newVal.match(/@(.+)$/);
    if (match) {
        const potentialDate = match[1];
        const parsedDate = parseTaskDate(potentialDate);
        if (parsedDate) {
            // Valid date found!
            // Strip the @part from content
            const cleanContent = newVal.substring(0, match.index).trim();
            setContent(cleanContent);
            
            // Update task with new content AND new date
            onUpdate?.({ 
                content: cleanContent,
                due_date: parsedDate 
            });
        }
    }
  };

  const handleDateSelect = (date: Date | null, recurrence?: any) => {
      onUpdate?.({ 
          due_date: date,
          recurrence_rule: recurrence?.type !== 'none' ? recurrence : null
      });
      // Don't close immediately if we want to allow further edits, but for now simple close is fine
      // DatePickerPopover handles its own internal close button, but we can close it here too
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        onEnter?.(content.trim().length === 0);
    }
    if (e.key === 'Backspace' && content.length === 0) {
        onBackspace?.();
    }
  };

  return (
    <div className="group flex items-center gap-2 py-1 transition-all duration-200 relative">
      
      {/* Metadata / Date Badge (Far Left - Gutter) */}
      <div className="flex-shrink-0 flex items-center justify-end" style={{ width: task.due_date ? 'auto' : '24px' }}>
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
                 /* Implicit Add Button (Ghost Icon) */
                 <button 
                    onClick={() => setShowDatePicker(true)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-secondary transition-opacity p-1"
                    title="Add Due Date"
                 >
                     <Calendar size={14} />
                 </button>
             )}
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className="flex-shrink-0 transition-colors text-text-muted hover:text-accent-green"
      >
        {task.status === 'done' ? (
             <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={2} />
        ) : (
             <Circle className="w-5 h-5" strokeWidth={2} />
        )}
      </button>

      {/* Text Input / Display */}
      <div className="flex-1 min-w-0">
            {onUpdate ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={content}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className={`
                        w-full bg-transparent border-none outline-none text-sm leading-relaxed p-0
                        ${task.status === 'done' ? 'line-through text-text-muted' : 'text-text-primary'}
                        placeholder:text-text-muted
                    `}
                    placeholder="Type a task... (@today)"
                />
            ) : (
                <div className={`text-sm leading-relaxed text-text-primary break-words ${task.status === 'done' ? 'line-through text-text-muted' : ''}`}>
                {task.content}
                </div>
            )}
      </div>
      
      {extraActions}
    </div>
  );
};
