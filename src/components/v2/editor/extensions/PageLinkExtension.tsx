
import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, ReactRenderer } from '@tiptap/react';
import { useEffect, useState, useRef } from 'react';
import { Page } from '../../../../types';
import { FileText } from 'lucide-react';
import Suggestion from '@tiptap/suggestion';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { PageLinkList } from '../PageLinkList';
import { PluginKey } from '@tiptap/pm/state';

const PageLinkNodeView = ({ node, updateAttributes, editor }: any) => {
  const { pageId, tempTitle } = node.attrs;
  const [page, setPage] = useState<Page | null>(null);
  const creatingRef = useRef(false);

  useEffect(() => {
    if (pageId) {
      // Existing page
      fetch(`/api/v2/pages?id=${pageId}`)
        .then(res => res.json())
        .then(data => setPage(data))
        .catch(err => console.error('Failed to load page', err));
    } else if (tempTitle && !creatingRef.current) {
      creatingRef.current = true;
      // Create new page optimistically
      const contextPageId = editor?.storage?.v2PageLink?.currentPageId;

      // Pending state
      setPage({
          id: 0,
          title: tempTitle,
          content: null,
          is_favorite: false,
          created_at: new Date(),
          updated_at: new Date()
      } as Page);

      fetch('/api/v2/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              title: tempTitle,
              parentPageId: contextPageId // Pass context
          })
      })
      .then(res => res.json())
      .then(data => {
          setPage(data);
          updateAttributes({ pageId: data.id, tempTitle: null });
      })
      .catch(err => {
          console.error('Failed to create page', err);
          creatingRef.current = false; // Allow retry on error
      });
    }
  }, [pageId, tempTitle, editor]); // Add editor to deps

  // ... (render logic unchanged)
  if (!page) {
     return <NodeViewWrapper className="inline-block text-gray-400">Loading page...</NodeViewWrapper>;
  }

  return (
    <NodeViewWrapper className="inline-flex">
      <a 
        href={`/page/${page.id}`} 
        onClick={(e) => {
            if (page.id === 0) e.preventDefault(); 
        }}
        className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors decoration-0 cursor-pointer"
        contentEditable={false}
      >
        <FileText size={14} />
        <span className="font-medium underline decoration-gray-300 underline-offset-2">{page.title}</span>
      </a>
    </NodeViewWrapper>
  );
};

export const PageLinkExtension = Node.create({
  name: 'v2PageLink',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
      return {
          currentPageId: null,
      }
  },

  addStorage() {
      return {
          currentPageId: this.options.currentPageId,
      }
  },

  addAttributes() {
    return {
      pageId: { default: null },
      tempTitle: { default: null }, 
    };
  },
  
  parseHTML() {
    return [{ tag: 'span[data-v2-page-link]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-v2-page-link': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageLinkNodeView);
  },

  addCommands() {
    return {
        insertPageLink: (options: { pageId?: number, tempTitle?: string }) => ({ commands }: { commands: any }) => {
            return commands.insertContent({
                type: this.name,
                attrs: options
            });
        }
    }
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isPageLink = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isPageLink = true;
              tr.insertText('', pos, pos + node.nodeSize);
            }
          });

          return isPageLink;
        }),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '[[',
        startOfLine: false,
        pluginKey: new PluginKey('pageLinkSuggestion'),
        allowSpaces: true,
        command: ({ editor, range, props }) => {
          const nodeAfter = editor.view.state.selection.$anchor.nodeAfter;
          const overrideSpace = nodeAfter?.text?.startsWith(' ');

          if (overrideSpace) {
            props.to += 1;
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: props,
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run();
        },
        items: async ({ query }) => {
          try {
            const res = await fetch(`/api/v2/pages?search=${encodeURIComponent(query)}`);
            if (res.ok) {
              const pages = await res.json();
              return pages.slice(0, 10);
            }
            return [];
          } catch (e) {
            console.error("Failed to fetch pages", e);
            return [];
          }
        },
        render: () => {
          let component: any;
          let popup: any;

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(PageLinkList, {
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
      }),
    ];
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    v2PageLink: {
      insertPageLink: (options: { pageId?: number, tempTitle?: string }) => ReturnType;
    };
  }
}
