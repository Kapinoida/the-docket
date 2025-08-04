import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { parseTasksFromContent, updateTaskInContent, ParsedTask, parseTaskDate } from './taskParser';

export interface TaskExtensionOptions {
  onTasksFound?: (tasks: ParsedTask[], noteId?: string) => void;
  onTaskToggle?: (taskId: string, completed: boolean, noteId?: string) => void;
  noteId?: string;
}

export const TaskExtensionPluginKey = new PluginKey('taskExtension');

export const TaskExtension = Extension.create<TaskExtensionOptions>({
  name: 'taskExtension',

  addOptions() {
    return {
      onTasksFound: undefined,
      onTaskToggle: undefined,
      noteId: undefined,
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { onTasksFound, noteId } = this.options;

        // Get the current line where cursor is positioned
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        // Get the current paragraph/line text
        const currentParagraph = $from.parent;
        const currentLineText = currentParagraph.textContent;
        
        console.log('[TaskExtension] Enter pressed on line:', currentLineText);
        
        // Check if current line is a task pattern
        const taskPattern = /^\s*-\s*\[([x\s])\]\s+(.+?)(?:\s+@(\w+|\d{4}-\d{2}-\d{2}))?$/;
        const match = currentLineText.match(taskPattern);
        
        if (match) {
          console.log('[TaskExtension] Task pattern detected:', match);
          
          const [fullMatch, checkboxState, taskContent, dateString] = match;
          console.log('[TaskExtension] Parsed task:', { fullMatch, checkboxState, taskContent, dateString });
          
          if (!taskContent || !taskContent.trim()) {
            console.warn('[TaskExtension] Task content is empty, skipping');
            return false;
          }
          
          const completed = checkboxState.toLowerCase() === 'x';
          const taskId = globalThis.crypto?.randomUUID() || Math.random().toString(36).substring(2) + Date.now().toString(36);
          
          // For now, just process the task without converting to TaskNode
          // TODO: Re-enable TaskNode conversion once we fix the command registration
          console.log('[TaskExtension] Processing task without TaskNode conversion for now');
          
          // Create a ParsedTask object for database processing
          if (onTasksFound) {
            // Parse the date if provided
            let dueDate = null;
            if (dateString) {
              dueDate = parseTaskDate(dateString);
            }
            
            const parsedTask: ParsedTask = {
              id: taskId,
              content: taskContent.trim(),
              completed,
              dueDate,
              dateString,
              startIndex: 0,
              endIndex: 0,
              fullMatch: currentLineText
            };
            
            console.log('[TaskExtension] Processing new task:', parsedTask);
            onTasksFound([parsedTask], noteId);
          }
          
          // Prevent default Enter behavior since we handled it
          return true;
        }
        
        // Allow the Enter key to proceed normally for non-task lines
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const { onTaskToggle, noteId } = this.options;

    return [
      new Plugin({
        key: TaskExtensionPluginKey,
        
        state: {
          init() {
            return {
              tasks: [] as ParsedTask[],
            };
          },

          apply(tr, oldState) {
            // Only track tasks, don't auto-process them
            if (!tr.docChanged) {
              return oldState;
            }

            const newContent = tr.doc.textContent;
            const { tasks } = parseTasksFromContent(newContent);
            
            return { tasks };
          },
        },

        props: {
          handleDOMEvents: {
            // Handle clicks on checkboxes
            click: (view, event) => {
              const target = event.target as HTMLElement;
              
              // Check if this is a click on a task checkbox
              if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
                const taskId = target.getAttribute('data-task-id');
                if (taskId && onTaskToggle) {
                  const completed = (target as HTMLInputElement).checked;
                  onTaskToggle(taskId, completed, noteId);
                  return true; // Prevent default handling
                }
              }
              
              return false;
            },
          },
        },
      }),
    ];
  },

  // Add commands to manually trigger task parsing
  addCommands() {
    return {
      parseTasksInContent:
        () =>
        ({ state, dispatch }) => {
          const content = state.doc.textContent;
          const { tasks } = parseTasksFromContent(content);
          
          if (this.options.onTasksFound) {
            this.options.onTasksFound(tasks, this.options.noteId);
          }
          
          return true;
        },

      toggleTask:
        (taskId: string, completed: boolean) =>
        ({ state, dispatch }) => {
          const content = state.doc.textContent;
          const updatedContent = updateTaskInContent(content, taskId, completed);
          
          if (this.options.onTaskToggle) {
            this.options.onTaskToggle(taskId, completed, this.options.noteId);
          }
          
          // Update the editor content
          if (dispatch && updatedContent !== content) {
            const tr = state.tr.insertText(updatedContent, 0, state.doc.content.size);
            dispatch(tr);
          }
          
          return true;
        },
    };
  },
});