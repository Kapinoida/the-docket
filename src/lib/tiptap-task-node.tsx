'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import React from 'react';

export interface TaskNodeAttributes {
  taskId: string;
  completed: boolean;
  content: string;
  dueDate?: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    taskNode: {
      setTaskNode: (attributes: TaskNodeAttributes) => ReturnType;
      toggleTaskCompletion: (taskId: string) => ReturnType;
    };
  }
}

// React component for rendering the task node
const TaskNodeComponent = React.forwardRef<
  HTMLDivElement,
  {
    node: {
      attrs: TaskNodeAttributes;
    };
    updateAttributes: (attributes: Partial<TaskNodeAttributes>) => void;
    extension: {
      options: {
        onTaskToggle?: (taskId: string, completed: boolean) => void;
      };
    };
  }
>(({ node, updateAttributes, extension }, ref) => {
  const { taskId, completed, content, dueDate } = node.attrs;
  const { onTaskToggle } = extension.options;

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCompleted = e.target.checked;
    updateAttributes({ completed: newCompleted });
    
    if (onTaskToggle) {
      onTaskToggle(taskId, newCompleted);
    }
  };

  return (
    <div ref={ref} className="task-node flex items-start gap-2 my-1" data-task-id={taskId}>
      <input
        type="checkbox"
        checked={completed}
        onChange={handleToggle}
        className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
      />
      <div className="flex-1">
        <span className={completed ? 'line-through text-gray-500' : ''}>
          {content}
        </span>
        {dueDate && (
          <span className="ml-2 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
            @{dueDate}
          </span>
        )}
      </div>
    </div>
  );
});

TaskNodeComponent.displayName = 'TaskNodeComponent';

export const TaskNode = Node.create<{
  onTaskToggle?: (taskId: string, completed: boolean) => void;
}>({
  name: 'taskNode',

  addOptions() {
    return {
      onTaskToggle: undefined,
    };
  },

  group: 'block',

  content: '',

  addAttributes() {
    return {
      taskId: {
        default: '',
        parseHTML: element => element.getAttribute('data-task-id'),
        renderHTML: attributes => ({
          'data-task-id': attributes.taskId,
        }),
      },
      completed: {
        default: false,
        parseHTML: element => element.getAttribute('data-completed') === 'true',
        renderHTML: attributes => ({
          'data-completed': attributes.completed.toString(),
        }),
      },
      content: {
        default: '',
        parseHTML: element => element.getAttribute('data-content'),
        renderHTML: attributes => ({
          'data-content': attributes.content,
        }),
      },
      dueDate: {
        default: null,
        parseHTML: element => element.getAttribute('data-due-date'),
        renderHTML: attributes => ({
          'data-due-date': attributes.dueDate,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-task-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'task-node' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskNodeComponent);
  },

  addCommands() {
    return {
      setTaskNode:
        (attributes: TaskNodeAttributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },

      toggleTaskCompletion:
        (taskId: string) =>
        ({ tr, state }) => {
          let updated = false;
          
          tr.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.taskId === taskId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                completed: !node.attrs.completed,
              });
              updated = true;
            }
          });
          
          return updated;
        },
    };
  },

  // Convert markdown-style tasks to task nodes
  addInputRules() {
    return [
      // This will be handled by our Enter key logic instead
    ];
  },
});