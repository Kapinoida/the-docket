'use client';

import React from 'react';
import { Task } from '@/types';
import TaskEditor from '@/components/TaskEditor';

interface TaskEditModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
}

export default function TaskEditModal({ task, isOpen, onClose, onSave, onDelete }: TaskEditModalProps) {
  if (!isOpen) return null;

  // Adapter to match TaskInstance expected by TaskEditor
  // Task interface (V2) vs TaskInstance (Legacy) mapping
  // We pass 'any' to avoid strict interface mismatches for now, relying on runtime properties which are compatible.
  const taskInstance: any = {
      ...task,
  };

  return (
    <TaskEditor
      task={taskInstance}
      onSave={(updates: any) => {
          // Map back to Partial<Task>
          // dates are Date objects in updates (from TaskEditor refactor)
          // TaskEditContext expects Partial<Task>
          onSave(updates);
          // Note: TaskEditor refactor no longer auto-closes, so we do it here if onSave is successful?
          // Actually TaskEditContext handles close.
          onClose(); 
      }}
      onClose={onClose}
      isInTab={false} 
    />
  );
}
