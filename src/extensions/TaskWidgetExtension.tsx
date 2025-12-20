import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { useState, useEffect } from 'react';
import ConnectedTaskWidget from '@/components/ConnectedTaskWidget';

// Task Widget Node View Component
const TaskWidgetNodeView = ({ 
  node, 
  updateAttributes, 
  editor 
}: { 
  node: ProseMirrorNode;
  updateAttributes: (attributes: any) => void;
  editor: any;
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const { taskId } = node.attrs;

  useEffect(() => {
    setIsMounted(true);
  }, []);


  const handleEdit = (taskId: string) => {
    // Emit custom event for parent components to handle
    editor.emit('taskEdit', { taskId });
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
        onEdit={handleEdit}
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
      insertTaskWidget: (taskId: string) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            taskId,
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

  // Add keyboard shortcuts for task operations
  addKeyboardShortcuts() {
    return {
      // Ctrl/Cmd + Shift + T to insert a new task widget
      'Mod-Shift-t': () => {
        // This will need to create a new task first, then insert widget
        this.editor.emit('createNewTask');
        return true;
      },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    taskWidget: {
      insertTaskWidget: (taskId: string) => ReturnType;
      updateTaskWidget: (taskId: string, newTaskId?: string) => ReturnType;
    };
  }
}