import React, { useState } from 'react';
import { NodeViewContent, NodeViewWrapper, Editor } from '@tiptap/react';
import { CheckCircle2, Circle, Calendar, Clock, GripVertical, MoreHorizontal } from 'lucide-react';
import { Task } from '../../types/v2';
import { format } from 'date-fns';
import { DatePickerPopover } from './DatePickerPopover';
import { useTaskParser } from '../../hooks/useTaskParser';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

interface EditorTaskItemProps {
  node: ProseMirrorNode;
  updateAttributes: (attrs: Record<string, any>) => void;
  editor: Editor;
  getPos: () => number;
  selected: boolean;
  
  // Legacy/Context Props (passed via logic, not directly from Tiptap sometimes)
  task: Task;
  onToggle: (id: number) => void;
  onUpdate?: (updates: Partial<Task>) => void;
}

export const EditorTaskItem: React.FC<EditorTaskItemProps> = ({ 
    node, updateAttributes, editor, getPos, selected,
    task, onToggle, onUpdate
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Hook to handle @date parsing automatically
  useTaskParser({
      node,
      editor,
      getPos,
      updateAttributes: (attrs) => {
          updateAttributes(attrs);
          onUpdate?.(attrs as Partial<Task>);
      }
  });

  const handleDateSelect = (date: Date | null, recurrence?: any) => {
      onUpdate?.({ 
          due_date: date,
          recurrence_rule: recurrence?.type !== 'none' ? recurrence : null
      });
      // Also update local attributes if not synced yet (optimistic)
      updateAttributes({ 
          due_date: date,
          recurrence_rule: recurrence?.type !== 'none' ? recurrence : null
      });
  };

  return (
    <NodeViewWrapper className={`group flex items-start gap-2 py-1 transition-all duration-200 relative ${selected ? 'bg-purple-50/50 dark:bg-purple-900/10 rounded-lg -mx-2 px-2' : ''}`}>
      
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className="mt-1 flex-shrink-0 transition-colors text-text-muted hover:text-accent-green select-none"
        contentEditable={false}
      >
        {task.status === 'done' ? (
             <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={2} />
        ) : (
             <Circle className="w-5 h-5" strokeWidth={2} />
        )}
      </button>

      {/* Metadata / Date Badge - Now on Left */}
      <div className="flex-shrink-0 flex items-center justify-center mt-1" style={{ width: task.due_date ? 'auto' : '24px' }} contentEditable={false}>
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

      {/* Editor Content Area */}
      <div className="flex-1 min-w-0">
          <NodeViewContent 
            className={`
                outline-none text-sm leading-relaxed min-h-[1.5em] py-1
                prose-p:m-0 prose-p:leading-relaxed
                ${task.status === 'done' ? 'line-through text-text-muted' : 'text-text-primary'}
            `} 
          />
      </div>



    </NodeViewWrapper>
  );
};
