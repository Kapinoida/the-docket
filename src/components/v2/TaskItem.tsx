import React, { useState, useRef, useCallback } from 'react';
import { CheckCircle2, Circle, Calendar, Clock, Edit2, Trash2, ArrowRight, MoreVertical } from 'lucide-react';
import { Task } from '../../types/v2';
import { format } from 'date-fns';
import { DatePickerPopover } from './DatePickerPopover';
import { useTaskEdit } from '../../contexts/TaskEditContext';
import { parseLocalDateNode } from '../../lib/dateUtils';

interface TaskItemProps {
  task: Task;
  onToggle: (id: number) => void;
  onUpdate?: (updates: Partial<Task>) => void;
  isSelectionEnabled?: boolean;
  isSelected?: boolean;
  onSelect?: (id: number, selected: boolean) => void;
  extraActions?: React.ReactNode;
  onMoveToPage?: () => void;
  onDelete?: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ 
    task, onToggle, onUpdate, isSelectionEnabled, isSelected, onSelect, extraActions, onMoveToPage, onDelete
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(task.content);
  const [showLongPressMenu, setShowLongPressMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const { openTaskEdit } = useTaskEdit();
  
  // Long-press state
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMoved = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // Close menu on scroll or resize
  React.useEffect(() => {
    if (!showLongPressMenu) return;
    const close = () => setShowLongPressMenu(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [showLongPressMenu]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchMoved.current = false;
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) {
        if (navigator.vibrate) navigator.vibrate(10);
        setMenuPosition({ x: touchStartPos.current.x, y: touchStartPos.current.y });
        setShowLongPressMenu(true);
      }
    }, 500);
  };

  const handleTouchMove = () => {
    touchMoved.current = true;
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const closeMenu = () => setShowLongPressMenu(false);

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
      openTaskEdit({
          ...task,
          id: task.id.toString(),
          dueDate: task.due_date ? parseLocalDateNode(task.due_date) : null,
          completed: task.status === 'done',
          createdAt: new Date(task.created_at),
          updatedAt: new Date(task.updated_at),
          content: task.content,
          recurrenceRule: task.recurrence_rule
      } as any);
  };

  const isDone = task.status === 'done';

  return (
    <div 
      className={`group flex items-start gap-1 sm:gap-1.5 py-1 transition-all duration-200 relative ${isSelected ? 'bg-purple-50/50 dark:bg-purple-900/10 rounded-lg -mx-2 px-2' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      
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
        className="mt-0.5 flex-shrink-0 transition-colors text-text-muted hover:text-accent-green select-none p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        {isDone ? (
             <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={2} />
        ) : (
             <Circle className="w-5 h-5" strokeWidth={2} />
        )}
      </button>

      {/* Metadata / Date Badge */}
      <div className="flex-shrink-0 flex items-center justify-center mt-0.5" style={{ width: task.due_date ? 'auto' : '28px' }}>
             {(task.due_date || showDatePicker) ? (
                <div className="relative">
                    <button 
                        ref={dateButtonRef}
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={`
                            flex items-center justify-center gap-1 text-xs px-2 py-1 rounded border transition-colors whitespace-nowrap min-h-[32px]
                            ${isDone ? 'text-text-muted border-transparent' : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 border-transparent hover:border-rose-100 dark:hover:border-rose-800'}
                            ${!task.due_date ? 'text-text-muted border-border-default border-dashed' : ''}
                        `}
                    >
                        {task.due_date ? (
                             <span className="font-mono font-medium">{format(parseLocalDateNode(task.due_date) as Date, 'MMM d')}
                               {format(parseLocalDateNode(task.due_date) as Date, 'HH:mm') !== '00:00' && (
                                 <span className="ml-1 text-text-muted">{format(parseLocalDateNode(task.due_date) as Date, 'h:mm a')}</span>
                               )}
                             </span>
                        ) : (
                             <Calendar size={14} />
                        )}
                        {task.recurrence_rule && <Clock size={10} className="ml-0.5" />}
                    </button>

                    {showDatePicker && (
                        <DatePickerPopover 
                            date={task.due_date ? parseLocalDateNode(task.due_date) : null}
                            recurrenceRule={task.recurrence_rule}
                            onSelect={handleDateSelect}
                            onClose={() => setShowDatePicker(false)}
                            triggerRef={dateButtonRef}
                        />
                    )}
                </div>
             ) : (
                 <button 
                    onClick={() => setShowDatePicker(true)}
                    className="md:opacity-0 md:group-hover:opacity-100 text-text-muted hover:text-text-secondary transition-opacity p-1"
                    title="Add Due Date"
                 >
                     <Calendar size={14} />
                 </button>
             )}
      </div>

      {/* Page Context Badge */}
      {task.page_name && !isDone && (
        <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 truncate max-w-[80px] sm:max-w-[100px] hidden sm:inline" title={task.page_name}>
          {task.page_name}
        </span>
      )}

      {/* Content Area */}
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
                      ${isDone ? 'line-through text-text-muted' : 'text-text-primary'}
                  `}
              />
          ) : (
              <div className={`text-sm leading-relaxed py-0 text-text-primary break-words ${isDone ? 'line-through text-text-muted' : ''}`}>
                  {task.content}
              </div>
          )}
      </div>

      {/* Edit Trigger — visible on mobile, hover-only on desktop */}
      <div className="flex items-center md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button
            onClick={handleEdit}
            className="p-1.5 text-text-muted hover:text-blue-500 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Edit Task"
        >
            <Edit2 size={14} />
        </button>
        {extraActions}
      </div>

      {/* Long-Press Context Menu */}
      {showLongPressMenu && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={closeMenu} onTouchStart={closeMenu} />
          {/* Menu */}
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl py-1.5 min-w-[160px] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: Math.min(menuPosition.x - 140, window.innerWidth - 176),
              top: Math.min(menuPosition.y - 10, window.innerHeight - 200),
            }}
          >
            <button
              onClick={() => { closeMenu(); handleEdit({ stopPropagation: () => {} } as any); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors min-h-[44px]"
            >
              <Edit2 size={16} className="text-text-muted" />
              Edit
            </button>
            <button
              onClick={() => { closeMenu(); onToggle(task.id); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors min-h-[44px]"
            >
              {isDone ? (
                <Circle size={16} className="text-text-muted" />
              ) : (
                <CheckCircle2 size={16} className="text-emerald-500" />
              )}
              {isDone ? 'Mark incomplete' : 'Mark complete'}
            </button>
            {onMoveToPage && (
              <button
                onClick={() => { closeMenu(); onMoveToPage(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors min-h-[44px]"
              >
                <ArrowRight size={16} className="text-text-muted" />
                Move to page
              </button>
            )}
            {onDelete && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                <button
                  onClick={() => { closeMenu(); onDelete(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 transition-colors min-h-[44px]"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
