import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // Ensure tooltip styles are loaded
import { SlashCommandList } from '../SlashCommandList';
import { PluginKey } from '@tiptap/pm/state';
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
    Table as TableIcon,
    FileText // Import for Subpage
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
      // Use proper custom task node conversion
      const pageId = editor.storage.v2PageLink?.currentPageId;
      editor.chain().focus().deleteRange(range).setNode('v2Task', { pageId }).run();
    },
  },
  {
    title: 'Subpage',
    icon: React.createElement(FileText, { size: 18 }),
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).insertPageLink({ tempTitle: 'Untitled Page' }).run();
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
    icon: React.createElement(WrapText, { size: 18 }),
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
        pluginKey: new PluginKey('slashCommandSuggestion'),
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
