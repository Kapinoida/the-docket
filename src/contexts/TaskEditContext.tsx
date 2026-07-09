'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Task } from '@/types';
import TaskEditModal from '@/components/TaskEditModal';
import { apiFetch, AuthError } from '@/lib/api';

interface TaskEditContextType {
  openTaskEdit: (task: Task) => void;
  createTask: () => void;
  closeTaskEdit: () => void;
}

const TaskEditContext = createContext<TaskEditContextType | null>(null);

export const useTaskEdit = () => {
  const context = useContext(TaskEditContext);
  if (!context) {
    throw new Error('useTaskEdit must be used within a TaskEditProvider');
  }
  return context;
};

interface TaskEditProviderProps {
  children: ReactNode;
}

export function TaskEditProvider({ children }: TaskEditProviderProps) {
  const [editingTask, setEditingTask] = useState<Task | Partial<Task> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const openTaskEdit = (task: Task) => {
    setEditingTask(task);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const createTask = () => {
    setEditingTask({ content: '', status: 'todo' });
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const closeTaskEdit = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setEditingTask(null);
      setIsCreating(false);
    }, 300);
  };

  const handleSave = async (updates: Partial<Task>) => {
    if (!editingTask) return;

    try {
      if (isCreating) {
        const newTask = await apiFetch<Task>('/api/v2/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        window.dispatchEvent(new CustomEvent('taskCreated', {
          detail: { task: newTask, source: 'modal' }
        }));
      } else {
        const taskId = (editingTask as Task).id;
        const updatedTask = await apiFetch<Task>(`/api/v2/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        window.dispatchEvent(new CustomEvent('taskUpdated', {
          detail: {
            taskId,
            task: updatedTask,
            source: 'modal'
          }
        }));
      }
    } catch (error) {
      console.error('Failed to save task:', error);
      throw error;
    }
  };

  const handleDelete = async (taskId: number) => {
    if (isCreating) return;

    try {
      await apiFetch(`/api/v2/tasks/${taskId}`, {
        method: 'DELETE',
      });

      window.dispatchEvent(new CustomEvent('taskDeleted', {
        detail: { taskId }
      }));
    } catch (error) {
      if (error instanceof AuthError) { throw error; }
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  return (
    <TaskEditContext.Provider value={{ openTaskEdit, createTask, closeTaskEdit }}>
      {children}
      {editingTask && (
        <TaskEditModal
          task={editingTask as Task}
          isOpen={isModalOpen}
          onClose={closeTaskEdit}
          onSave={handleSave}
          onDelete={!isCreating ? handleDelete : undefined}
        />
      )}
    </TaskEditContext.Provider>
  );
}