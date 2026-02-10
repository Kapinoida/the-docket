
import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Selection } from '@tiptap/pm/state';
import { useState, useEffect, useRef } from 'react';
import { EditorTaskItem } from '../../EditorTaskItem';
import { Task } from '../../../../types/v2';

// Extend the EditorEvents interface (Module Augmentation)
declare module '@tiptap/core' {
  interface EditorEvents {
    'v2:createTask': void;
  }
}

// Node View for V2 Task
const V2TaskNodeView = ({ node, updateAttributes, editor, getPos, selected }: any) => {
  const { taskId, autoFocus, pageId } = node.attrs;
  const [task, setTask] = useState<Task | null>(null);

  // Ref to track if component is mounted for async operations
  const isMounted = useRef(true);
  const isCreating = useRef(false);
  const updateTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
      isMounted.current = true;
      return () => { 
          isMounted.current = false; 
          if (updateTimeout.current) clearTimeout(updateTimeout.current);
      };
  }, []);

  // Initial Data / Creation / Hydration
  useEffect(() => {
    // Case 1: Existing Task (ID provided)
    if (taskId) {
      if (!isMounted.current) return;
      
      fetch(`/api/v2/tasks?id=${taskId}`)
        .then(res => res.json())
        .then(data => {
            if (!isMounted.current) return;
            setTask(data);

            // HYDRATION: If the editor node is empty but the DB has content, inject it!
            // This fixes the migration issue where legacy tasks appeared blank.
            if (node.content.size === 0 && data.content && data.content.length > 0) {
                 // Schedule insertion to avoid conflicting with render
                 setTimeout(() => {
                     if (!isMounted.current) return;
                     // Double check size
                     if (node.content.size === 0) {
                         // Insert content at the start of this node
                         // We use a transaction to ensure we insert *into* the node
                         try {
                             const pos = getPos();
                             if (typeof pos === 'number') {
                                 editor.commands.insertContentAt(pos + 1, data.content);
                             }
                         } catch (e) {
                             console.error("Failed to hydrate task content", e);
                         }
                     }
                 }, 0);
            }
        })
        .catch(err => console.error('Failed to load task', err));
    } 
    // Case 2: New Task (No ID)
    else {
        // Optimistic temporary task
        setTask({
            id: 0, 
            content: '',
            status: 'todo',
            due_date: null,
            created_at: new Date(),
            updated_at: new Date()
        } as Task);
    }
  }, [taskId]);

  // CONTENT AUTO-SAVE
  // Listen to node.textContent changes and sync to DB
  useEffect(() => {
      // Only run if we have a valid task and content actually changed
      if (!task || !taskId || !isMounted.current) return;
      if (typeof task.id !== 'number' || task.id === 0) return;

      const currentContent = node.textContent;

      // Don't save if content matches what we think the DB has
      // (This avoids loops when Hydrating)
      if (currentContent === task.content) return;

      // Debounce save
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
      updateTimeout.current = setTimeout(async () => {
          if (!isMounted.current) return;
          
          // Update local state to match current reality so we don't save again
          setTask(prev => prev ? ({ ...prev, content: currentContent }) : null);

          await fetch(`/api/v2/tasks/${task.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: currentContent })
          }).catch(err => console.error("Auto-save failed", err));
          
      }, 1000); // 1-second debounce for text

      return () => {
          if (updateTimeout.current) clearTimeout(updateTimeout.current);
      };
  }, [node.textContent, taskId]); // task.content excluded to avoid loop

  const handleToggle = async () => {
    if (!task) return;
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    setTask({ ...task, status: newStatus as any });
    
    // Only persist if task exists in DB and has a valid ID
    if (typeof task.id === 'number' && task.id !== 0) {
        await fetch(`/api/v2/tasks/${task.id}`, { 
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: newStatus }) 
        });
    } else {
        // If toggling a temp task, create it if not already creating
        if (!isCreating.current) {
             createTask({ status: newStatus });
        }
    }
  };

  const createTask = async (initialData: Partial<Task> = {}) => {
      if (isCreating.current) return;
      isCreating.current = true;

      try {
          // Use node text content as the source of truth
          const contentToSave = node.textContent || '';
          
          const res = await fetch('/api/v2/tasks', { 
              method: 'POST', 
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ 
                  content: contentToSave,
                  pageId: pageId, 
                  ...initialData
              })
          });
          
          if (!res.ok) throw new Error('Failed to create task');
          
          const data = await res.json();
          
          if (isMounted.current) {
               setTask(data);
               // IMPORTANT: Update the taskId attribute so subsequent edits map to this ID
               updateAttributes({ taskId: data.id });
          } else {
               // If unmounted, delete the orphaned task
               fetch(`/api/v2/tasks?id=${data.id}`, { method: 'DELETE' });
          }
      } catch (err) {
          console.error('Failed to create task', err);
      } finally {
          isCreating.current = false;
      }
  };

  const handleUpdate = async (updates: Partial<Task>) => {
      if (!task) return;

      // Optimistic update
      const updatedTask = { ...task, ...updates };
      setTask(updatedTask);
      
      // Debounce updates
      if (updateTimeout.current) clearTimeout(updateTimeout.current);

      if (typeof task.id === 'number' && task.id !== 0) {
          // Existing task - UPDATE with debounce
          updateTimeout.current = setTimeout(async () => {
              if (isMounted.current) {
                 await fetch(`/api/v2/tasks/${task.id}`, {
                     method: 'PUT',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify(updates)
                 });
              }
          }, 500); 
      } else {
          // Temp task - CREATE (first input or date set)
          if (updates.content || updates.due_date) {
            createTask(updates);
          }
      }
  };

  // Creation effect (Separated for clarity)
  useEffect(() => {
      // If we have content but no ID, create it!
      if (!taskId && node.textContent.trim().length > 0 && !isCreating.current && (!task || task.id === 0)) {
           // Debounce creation slightly
           const timer = setTimeout(() => {
               createTask({ content: node.textContent });
           }, 500);
           return () => clearTimeout(timer);
      }
  }, [node.textContent, taskId]);


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
    <EditorTaskItem 
        node={node}
        updateAttributes={updateAttributes}
        editor={editor}
        getPos={getPos}
        selected={selected}
        task={task || { id:0, content: node.textContent, status:'todo', due_date:null } as any} 
        onToggle={handleToggle} 
        onUpdate={handleUpdate}
    />
  );
};

export const TaskExtension = Node.create({
  name: 'v2Task',
  group: 'block',
  content: 'inline*',
  draggable: true,

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
      },
      due_date: {
          default: null
      },
      status: {
          default: 'todo'
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="v2-task"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-type': 'v2-task', ...HTMLAttributes }, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(V2TaskNodeView);
  },

  addKeyboardShortcuts() {
      return {
          'Enter': ({ editor }) => {
              const { selection } = editor.state;
              const { $from } = selection;
              const node = $from.node();
              
              if (node.type.name === this.name) {
                  // If empty, turn into paragraph (break out of list)
                  if (node.content.size === 0) {
                       // Delete the task from DB if it existed
                       const taskId = node.attrs.taskId;
                       if (taskId) {
                           fetch(`/api/v2/tasks?id=${taskId}`, { method: 'DELETE' }).catch(console.error);
                       }
                       
                       return editor.commands.setParagraph();
                  }
                  // Otherwise, split block (create new task)
                  return editor.chain()
                      .splitBlock()
                      .setNode('v2Task', { taskId: null, pageId: this.options.pageId, status: 'todo', autoFocus: true })
                      .run();
              }
              return false;
          },
          'Backspace': ({ editor }) => {
              const { selection } = editor.state;
              const { $from, empty } = selection;
              const node = $from.node();
              
              if (node.type.name === this.name && empty && $from.parentOffset === 0) {
                  // At start of task
                  
                  // If empty, delete it
                  if (node.content.size === 0) {
                       const taskId = node.attrs.taskId;
                       if (taskId) {
                           fetch(`/api/v2/tasks?id=${taskId}`, { method: 'DELETE' }).catch(console.error);
                       }
                       // Let native backspace handle the DOM removal / lift
                       return false; 
                  }
              }
              return false;
          }
      }
  },

  addCommands() {
    return {
      insertV2Task: (taskId?: string) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { 
              taskId: taskId || null, 
              pageId: this.options.pageId, 
              autoFocus: true 
          },
        });
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^(-\s)?\[([ xX])\]\s$/,
        handler: ({ state, range, chain, match }) => {
            const completed = match[2].toLowerCase() === 'x';
            chain()
                .deleteRange(range)
                .insertV2Task()
                .updateAttributes('v2Task', { status: completed ? 'done' : 'todo' })
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
