import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
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
  FileText,
  ChevronRight,
} from 'lucide-react';
import React from 'react';

type CommandGroup = 'basic' | 'lists' | 'advanced' | 'media';

interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ReactElement;
  group: CommandGroup;
  command: (args: { editor: any; range: any }) => void;
}

const GROUP_LABELS: Record<CommandGroup, string> = {
  basic: 'Basic blocks',
  lists: 'Lists',
  advanced: 'Advanced',
  media: 'Media',
};

const CommandListItems: SlashCommandItem[] = [
  {
    title: 'Text',
    description: 'Plain text paragraph.',
    icon: <Text size={18} />,
    group: 'basic',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Large section heading.',
    icon: <Heading1 size={18} />,
    group: 'basic',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    icon: <Heading2 size={18} />,
    group: 'basic',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    icon: <Heading3 size={18} />,
    group: 'basic',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'A simple bulleted list.',
    icon: <List size={18} />,
    group: 'lists',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Ordered List',
    description: 'A numbered list.',
    icon: <ListOrdered size={18} />,
    group: 'lists',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Task List',
    description: 'Track to-dos with checkboxes.',
    icon: <CheckSquare size={18} />,
    group: 'lists',
    command: ({ editor, range }) => {
      const pageId = editor.storage.v2PageLink?.currentPageId;
      editor.chain().focus().deleteRange(range).setNode('v2Task', { pageId }).run();
    },
  },
  {
    title: 'Subpage',
    description: 'Create a link to a new page.',
    icon: <FileText size={18} />,
    group: 'advanced',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertPageLink({ tempTitle: 'Untitled Page' }).run();
    },
  },
  {
    title: 'Code Block',
    description: 'Syntax-highlighted code.',
    icon: <Code size={18} />,
    group: 'advanced',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Blockquote',
    description: 'Capture a quote.',
    icon: <WrapText size={18} />,
    group: 'advanced',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Toggle Block',
    description: 'Collapsible content section.',
    icon: <ChevronRight size={18} />,
    group: 'advanced',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertCollapsibleBlock().run();
    },
  },
  {
    title: 'Table',
    description: 'Insert a 3×3 table.',
    icon: <TableIcon size={18} />,
    group: 'advanced',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: 'Image',
    description: 'Upload an image from your device.',
    icon: <ImageIcon size={18} />,
    group: 'media',
    command: ({ editor, range }) => {
      // Delete the slash command text first
      editor.chain().focus().deleteRange(range).run();
      // Trigger a file picker for image upload
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await fetch('/api/v2/upload', { method: 'POST', body: formData });
          if (res.ok) {
            const data = await res.json();
            editor.chain().focus().setImage({ src: data.url }).run();
          } else {
            console.error('Image upload failed');
          }
        } catch (e) {
          console.error('Image upload failed', e);
        }
      };
      input.click();
    },
  },
];

export { GROUP_LABELS, CommandListItems };
export type { SlashCommandItem, CommandGroup };

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        allowSpaces: true,
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
                item.title.toLowerCase().includes(query.toLowerCase())
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