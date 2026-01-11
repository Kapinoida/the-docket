
import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useEffect, useState, useRef } from 'react';
import { Page } from '../../../../types/v2';
import { FileText } from 'lucide-react';

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
  
  // ... (rest unchanged)

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

  addInputRules() {
      return [
          new InputRule({
              find: /\[\[(.+?)\]\]$/,
              handler: ({ state, range, match, chain }) => {
                  const title = match[1];
                  chain()
                    .deleteRange(range)
                    .insertPageLink({ tempTitle: title })
                    .insertContent(' ') // Add space to move out of node
                    .run();
              }
          })
      ]
  }
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    v2PageLink: {
      insertPageLink: (options: { pageId?: number, tempTitle?: string }) => ReturnType;
    };
  }
}
