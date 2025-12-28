import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { useState, useEffect, useRef } from 'react';
import ConnectedTaskWidget from '@/components/ConnectedTaskWidget';

// Task Widget Node View Component
const TaskWidgetNodeView = ({ 
  node, 
  updateAttributes, 
  editor,
  getPos
}: { 
  node: ProseMirrorNode;
  updateAttributes: (attributes: any) => void;
  editor: any;
  getPos: () => number | boolean | undefined;
}) => {
  const [isMounted, setIsMounted] = useState(false);
  // Extract attributes including the new autoFocus
  const { taskId, initialContent, initialCompleted, autoFocus } = node.attrs;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleEdit = (taskId: string) => {
    editor.emit('taskEdit', { taskId });
  };

  const handleEnter = () => {
    // Calculate position after this node
    const pos = getPos();
    if (typeof pos === 'number') {
        const insertionPos = pos + node.nodeSize;
        editor.emit('createNewTask', { insertionPos });
    } else {
        // Fallback if we can't get pos
        editor.emit('createNewTask');
    }
  };

  const handleDelete = () => {
    // If backspace pressed on empty task, replace it with a paragraph
    // AND delete it from the database (Ghost Task fix)
    if (taskId) {
        editor.emit('deleteTask', { taskId });
    }

    const pos = getPos();
    if (typeof pos === 'number') {
        const tr = editor.state.tr;
        const range = { from: pos, to: pos + node.nodeSize };
        
        // We chain commands: delete the widget, then insert a paragraph
        editor.chain()
          .deleteRange(range)
          .insertContentAt(pos, { type: 'paragraph', content: [] })
          .focus(pos)
          .run();
    }
  };

  const handleRemove = () => {
    // Just remove the node from the document (used for ghost cleanup)
    const pos = getPos();
    console.log(`[TaskWidgetExtension] Removing ghost task widget ${taskId} at pos:`, pos);
    
    if (typeof pos === 'number') {
        const range = { from: pos, to: pos + node.nodeSize };
        editor.chain()
          .deleteRange(range)
          .run(); // No focus change or paragraph insertion needed for auto-cleanup
    } else {
        console.warn(`[TaskWidgetExtension] Could not remove widget ${taskId}: Invalid pos`, pos);
    }
  };

  if (!isMounted) {
    return (
      <NodeViewWrapper className="task-widget-wrapper">
        <div className="inline-flex items-center gap-2 py-1 px-1">
          <div className="w-4 h-4 rounded border-2 border-gray-300 animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="task-widget-wrapper">
      <ConnectedTaskWidget
        taskId={taskId || ''}
        initialContent={initialContent}
        initialCompleted={initialCompleted}
        autoFocus={autoFocus} // Pass autoFocus prop
        onEdit={handleEdit}
        onEnter={handleEnter}
        onDelete={handleDelete}
        onNotFound={handleRemove}
        className="my-1"
      />
    </NodeViewWrapper>
  );
};

// TipTap Node Extension
export const TaskWidgetExtension = Node.create({
  name: 'taskWidget',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      taskId: {
        default: null,
        parseHTML: element => element.getAttribute('data-task-id'),
        renderHTML: attributes => {
          if (!attributes.taskId) {
            return {};
          }
          return {
            'data-task-id': attributes.taskId,
          };
        },
      },
      initialContent: {
        default: null,
        renderHTML: () => ({}),
        keepOnSplit: false,
      },
      initialCompleted: {
        default: false,
        renderHTML: () => ({}),
        keepOnSplit: false,
      },
      // New attribute for focus management
      autoFocus: {
        default: false,
        renderHTML: () => ({}), // Don't persist to HTML
        keepOnSplit: false,
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-task-widget]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          return {
            taskId: element.getAttribute('data-task-id'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-task-widget': '',
      'data-task-id': node.attrs.taskId || '',
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TaskWidgetNodeView);
  },

  addCommands() {
    return {
      // Update signature to accept autoFocus
      insertTaskWidget: (taskId: string, initialContent?: string, initialCompleted?: boolean, autoFocus?: boolean) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            taskId,
            initialContent,
            initialCompleted,
            autoFocus
          },
        });
      },
      
      updateTaskWidget: (taskId: string, newTaskId?: string) => ({ commands }) => {
        return commands.updateAttributes(this.name, {
          taskId: newTaskId || taskId,
        });
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\[ \]\s$/,
        handler: ({ range }) => {
          this.editor.commands.deleteRange(range);
          this.editor.emit('createNewTask', undefined);
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-t': () => {
        this.editor.emit('createNewTask', undefined);
        return true;
      },
      
      'Mod-Enter': () => {
        const { $from } = this.editor.state.selection;
        const node = $from.parent;
        
        if (node.type.name === 'paragraph') {
          const text = node.textContent;
          if (!text.trim()) {
            this.editor.emit('createNewTask', undefined);
          } else {
             this.editor.emit('convertLineToTask', { content: text });
          }
          return true;
        }
        return false;
      },

      'Mod-d': () => {
         const { selection } = this.editor.state;
         if ('node' in selection && (selection as any).node.type.name === this.name) {
             const taskId = (selection as any).node.attrs.taskId;
             this.editor.emit('taskEdit', { taskId });
             return true;
         }
         return false;
      }
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    taskWidget: {
      insertTaskWidget: (taskId: string, initialContent?: string, initialCompleted?: boolean, autoFocus?: boolean) => ReturnType;
      updateTaskWidget: (taskId: string, newTaskId?: string) => ReturnType;
    };
  }
}