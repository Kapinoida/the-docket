'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Task } from '@/types';
import TaskEditModal from '@/components/TaskEditModal';

interface TaskEditContextType {
  openTaskEdit: (task: Task) => void;
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openTaskEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const closeTaskEdit = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingTask(null), 300); // Delay to allow modal animation
  };

  const handleSave = async (updates: Partial<Task>) => {
    if (!editingTask) return;

    try {
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      const updatedTask = await response.json();
      console.log('Task updated successfully:', updatedTask);
      
      // Emit a custom event to notify other components of the update
      window.dispatchEvent(new CustomEvent('taskUpdated', {
        detail: { 
          taskId: editingTask.id, 
          task: updatedTask,
          source: 'modal'
        }
      }));
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.statusText}`);
      }

      console.log('Task deleted successfully:', taskId);
      
      // Emit a custom event to notify other components of the deletion
      window.dispatchEvent(new CustomEvent('taskDeleted', {
        detail: { taskId }
      }));
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  return (
    <TaskEditContext.Provider value={{ openTaskEdit, closeTaskEdit }}>
      {children}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          isOpen={isModalOpen}
          onClose={closeTaskEdit}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </TaskEditContext.Provider>
  );
}