
import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { useState, useEffect } from 'react';
import { TaskItem } from '../../TaskItem';
import { Task } from '../../../../types/v2';

// Extend the EditorEvents interface (Module Augmentation)
declare module '@tiptap/core' {
  interface EditorEvents {
    'v2:createTask': void;
  }
}

// Node View for V2 Task
const V2TaskNodeView = ({ node, updateAttributes, editor, getPos }: any) => {
  const { taskId, autoFocus, pageId } = node.attrs;
  const [task, setTask] = useState<Task | null>(null);

  // Initial Data / Creation
  useEffect(() => {
    // Case 1: Existing Task (ID provided)
    if (taskId) {
      fetch(`/api/v2/tasks?id=${taskId}`)
        .then(res => res.json())
        .then(data => setTask(data))
        .catch(err => console.error('Failed to load task', err));
    } 
    // Case 2: New Task (No ID, creating...)
    else {
        // Optimistic temporary task to show immediately
        setTask({
            id: 0, // Temp
            content: '',
            status: 'todo',
            due_date: null,
            created_at: new Date(),
            updated_at: new Date()
        } as Task);

        // Create on backend
        fetch('/api/v2/tasks', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                content: '',
                pageId: pageId // Pass the page context
            })
        })
        .then(res => res.json())
        .then(data => {
            // Update local state with real data
            setTask(data);
            // Update Node Attributes so functionality persists
            updateAttributes({ taskId: data.id });
        })
        .catch(err => console.error('Failed to create task', err));
    }
  }, [taskId]); // Only run if taskId changes (or is initially null)

  // ... (rest of component matches existing)
  const handleToggle = async () => {
    if (!task) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    setTask({ ...task, status: newStatus as any });
    
    if (task.id !== 0) {
        await fetch(`/api/v2/tasks/${task.id}`, { 
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: newStatus }) 
        });
    }
  };

  const handleUpdate = async (updates: Partial<Task>) => {
      // Optimistic update
      if (task) {
          const updatedTask = { ...task, ...updates };
          setTask(updatedTask);
          
          if (task.id !== 0) {
                 await fetch(`/api/v2/tasks/${task.id}`, {
                     method: 'PUT',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify(updates)
                 });
          }
      }
  };

  const handleEnter = (isEmpty: boolean) => {
      const currentPos = getPos();
      
      if (isEmpty) {
          // If empty, delete the task and create a paragraph (exit list)
          editor.commands.deleteRange({ from: currentPos, to: currentPos + node.nodeSize });
          editor.commands.insertContentAt(currentPos, { type: 'paragraph' });
          editor.commands.focus(currentPos);
      } else {
          // Create a new task below
          const pos = currentPos + node.nodeSize;
          
          editor.commands.insertContentAt(pos, {
              type: 'v2Task',
              attrs: { 
                  pageId: pageId, // Inherit context
                  autoFocus: true 
              }
          });
      }
  };

  const handleBackspace = () => {
      // Delete the task if empty on backspace
      const currentPos = getPos();
      editor.commands.deleteRange({ from: currentPos, to: currentPos + node.nodeSize });
      editor.commands.focus(currentPos - 1);
  };

  if (!task && taskId) {
      // Loading existing task
    return (
        <NodeViewWrapper className="my-2">
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl animate-pulse">
                <div className="w-5 h-5 bg-gray-200 rounded-full" />
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
            </div>
        </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="my-2" data-task-id={taskId || 'pending'}>
      <TaskItem 
        task={task || { id:0, content:'', status:'todo', due_date:null } as any} 
        onToggle={handleToggle} 
        onUpdate={handleUpdate}
        onEnter={handleEnter}
        onBackspace={handleBackspace}
        autoFocus={autoFocus} 
      />
    </NodeViewWrapper>
  );
};

export const TaskExtension = Node.create({
  name: 'v2Task',
  group: 'block',
  atom: true,

  addOptions() {
      return {
          pageId: null,
      }
  },

  addAttributes() {
    return {
      taskId: {
        default: null,
      },
      pageId: {
          default: null,
      },
      autoFocus: {
          default: false,
          renderHTML: () => ({}),
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-v2-task]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-v2-task': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(V2TaskNodeView);
  },

  addCommands() {
    return {
      insertV2Task: (taskId?: string) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { 
              taskId: taskId || null, 
              pageId: this.options.pageId, // Use configured pageId
              autoFocus: true 
          },
        });
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\[ \]\s$/,
        handler: ({ state, range, chain }) => {
            chain()
                .deleteRange(range)
                .insertV2Task()
                .run();
        },
      }),
    ];
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    v2Task: {
      insertV2Task: (taskId?: string) => ReturnType;
    };
  }
}

