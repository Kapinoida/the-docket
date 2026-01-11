import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // Ensure tooltip styles are loaded
import { SlashCommandList } from '../SlashCommandList';
import { 
    Heading1, 
    Heading2, 
    Heading3, 
    List, 
    ListOrdered, 
    CheckSquare, 
    Image as ImageIcon,
    Text,
    Code,
    Quote as WrapText,
    Table as TableIcon
  } from 'lucide-react';
import React from 'react';

const CommandListItems = [
  {
    title: 'Text',
    icon: React.createElement(Text, { size: 18 }),
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Heading 1',
    icon: React.createElement(Heading1, { size: 18 }),
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    icon: React.createElement(Heading2, { size: 18 }),
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    icon: React.createElement(Heading3, { size: 18 }),
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    icon: React.createElement(List, { size: 18 }),
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Ordered List',
    icon: React.createElement(ListOrdered, { size: 18 }),
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Task List',
    icon: React.createElement(CheckSquare, { size: 18 }),
    command: ({ editor, range }: any) => {
        // Using our V2 Task insertion logic, but we need to create a task first?
        // Or just using standard task list if we want simple ones.
        // For consistency with "The Docket", we should trigger the V2 Task creation flow.
        // We can do this by just inserting a specialized task node or prompting.
        // For now, let's insert a prompt to creating a task like the manual button did.
        
        // Actually, cleaner UX: Insert a prompt line or trigger the modal.
        // Let's defer to the complex task logic:
        const content = prompt("Task content?");
        if (content) {
            // This is async, so we can't reliably chain it inside the synchronous command easily without custom logic
            // But we can fire-and-forget the fetch
             fetch('/api/v2/tasks', { method: 'POST', body: JSON.stringify({ content })})
                .then(r => r.json())
                .then(task => {
                     // We need to access the editor instance later.
                     // Since deleteRange happens first, we are at the cursor.
                     editor.chain().focus().insertV2Task(task.id).run();
                });
             editor.chain().focus().deleteRange(range).run();   
        } else {
             // If cancelled, just delete the slash command
             editor.chain().focus().deleteRange(range).run();
        }
    },
  },
  {
    title: 'Code Block',
    icon: React.createElement(Code, { size: 18 }),
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Blockquote',
    icon: React.createElement(WrapText, { size: 18 }), // Changed from Quote because Quote might not be exported or aliased? Let's use Quote if defined or import it.
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
      title: 'Table',
      icon: React.createElement(TableIcon, { size: 18 }),
      command: ({ editor, range }: any) => {
           editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      }
  },
  {
      title: 'Image',
      icon: React.createElement(ImageIcon, { size: 18 }),
      command: ({ editor, range }: any) => {
           const url = prompt("Image URL");
           if (url) {
               editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
           } else {
               editor.chain().focus().deleteRange(range).run();
           }
      }
  }
];

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
}).configure({
    suggestion: {
        items: ({ query }: { query: string }) => {
            return CommandListItems.filter(item =>
                item.title.toLowerCase().startsWith(query.toLowerCase())
            ).slice(0, 10);
        },
        render: () => {
            let component: any;
            let popup: any;

            return {
                onStart: (props: any) => {
                    component = new ReactRenderer(SlashCommandList, {
                        props,
                        editor: props.editor,
                    });

                    if (!props.clientRect) {
                        return;
                    }

                    popup = tippy('body', {
                        getReferenceClientRect: props.clientRect,
                        appendTo: () => document.body,
                        content: component.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: 'manual',
                        placement: 'bottom-start',
                    });
                },
                onUpdate(props: any) {
                    component.updateProps(props);

                    if (!props.clientRect) {
                        return;
                    }

                    popup[0].setProps({
                        getReferenceClientRect: props.clientRect,
                    });
                },
                onKeyDown(props: any) {
                    if (props.event.key === 'Escape') {
                        popup[0].hide();
                        return true;
                    }
                    return component.ref?.onKeyDown(props);
                },
                onExit() {
                    popup[0].destroy();
                    component.destroy();
                },
            };
        },
    },
});
