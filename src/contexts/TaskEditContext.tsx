'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Task } from '@/types';
import TaskEditModal from '@/components/TaskEditModal';

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
    setEditingTask({ content: '', completed: false });
    setIsCreating(true);
    setIsModalOpen(true);
  }

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
      // Map legacy updates to V2 format
      const v2Updates: any = { ...updates };
      if (updates.dueDate !== undefined) v2Updates.due_date = updates.dueDate;
      if (updates.completed !== undefined) v2Updates.status = updates.completed ? 'done' : 'todo';
      delete v2Updates.dueDate;
      delete v2Updates.completed;

      if (isCreating) {
         const response = await fetch('/api/v2/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(v2Updates),
        });

        if (!response.ok) {
          throw new Error(`Failed to create task: ${response.statusText}`);
        }

        const v2Task = await response.json();
        const newTask = {
            ...v2Task,
            dueDate: v2Task.due_date,
            completed: v2Task.status === 'done'
        };
        console.log('Task created successfully:', newTask);
        
        window.dispatchEvent(new CustomEvent('taskCreated', {
          detail: { task: newTask, source: 'modal' }
        }));
      } else {
        // Update existing task
        const response = await fetch(`/api/v2/tasks?id=${(editingTask as Task).id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(v2Updates),
        });

        if (!response.ok) {
          throw new Error(`Failed to update task: ${response.statusText}`);
        }

        const v2Task = await response.json();
        const updatedTask = {
            ...v2Task,
            dueDate: v2Task.due_date,
            completed: v2Task.status === 'done'
        };
        console.log('Task updated successfully:', updatedTask);
        
        window.dispatchEvent(new CustomEvent('taskUpdated', {
          detail: { 
            taskId: (editingTask as Task).id, 
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

  const handleDelete = async (taskId: string) => {
    if (isCreating) return; // Cannot delete what doesn't exist yet

    try {
      const response = await fetch(`/api/v2/tasks?id=${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.statusText}`);
      }

      console.log('Task deleted successfully:', taskId);
      
      window.dispatchEvent(new CustomEvent('taskDeleted', {
        detail: { taskId }
      }));
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  return (
    <TaskEditContext.Provider value={{ openTaskEdit, createTask, closeTaskEdit }}>
      {children}
      {editingTask && (
        <TaskEditModal
          task={editingTask as Task} // Type assertion okay because Modal handles empty ID gracefully or we fix Modal
          isOpen={isModalOpen}
          onClose={closeTaskEdit}
          onSave={handleSave}
          onDelete={!isCreating ? handleDelete : undefined}
        />
      )}
    </TaskEditContext.Provider>
  );
}