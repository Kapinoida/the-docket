'use client';

import React from 'react';
import { Task } from '@/types';
import TaskEditor from '@/components/TaskEditor';

interface TaskEditModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Task>) => void;
  onDelete?: (taskId: number) => void;
}

export default function TaskEditModal({ task, isOpen, onClose, onSave, onDelete }: TaskEditModalProps) {
  if (!isOpen) return null;

  return (
    <TaskEditor
      task={task}
      onSave={(updates: any) => {
        onSave(updates);
        onClose();
      }}
      onClose={onClose}
      isInTab={false}
    />
  );
}