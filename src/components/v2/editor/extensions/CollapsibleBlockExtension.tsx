import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronRight } from 'lucide-react';

// ── React Node View ──────────────────────────────────────

const CollapsibleBlockNodeView = ({ node, updateAttributes }: any) => {
  const collapsed = node.attrs.collapsed;

  return (
    <NodeViewWrapper
      className="collapsible-block my-2 border border-gray-200 rounded-lg overflow-hidden"
      data-collapsed={collapsed}
    >
      {/* Toggle header */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 cursor-pointer select-none hover:bg-gray-100 transition-colors"
        contentEditable={false}
        onClick={() => updateAttributes({ collapsed: !collapsed })}
      >
        <ChevronRight
          size={16}
          className={`text-gray-400 transition-transform duration-150 ${
            collapsed ? '' : 'rotate-90'
          }`}
        />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Toggle
        </span>
      </div>

      {/* Collapsible content area */}
      <div className={`${collapsed ? 'hidden' : 'block'} px-3 py-2`}>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
};

// ── TipTap Extension ─────────────────────────────────────

export const CollapsibleBlockExtension = Node.create({
  name: 'collapsibleBlock',

  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      collapsed: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attrs) => {
          if (attrs.collapsed) {
            return { 'data-collapsed': 'true' };
          }
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="collapsible-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'collapsible-block' }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CollapsibleBlockNodeView);
  },

  addCommands() {
    return {
      insertCollapsibleBlock:
        () =>
        ({ editor, commands }) => {
          return commands.insertContentAt(editor.state.selection.from, {
            type: this.name,
            attrs: { collapsed: false },
            content: [{ type: 'paragraph' }],
          });
        },

      toggleCollapsible:
        () =>
        ({ editor, commands }) => {
          const { selection } = editor.state;
          const depth = selection.$from.depth;
          for (let d = depth; d >= 0; d--) {
            const node = selection.$from.node(d);
            if (node?.type.name === this.name) {
              return commands.updateAttributes(this.name, {
                collapsed: !node.attrs.collapsed,
              });
            }
          }
          return false;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Ctrl-Shift-L': () => this.editor.commands.toggleCollapsible(),
    };
  },
});

// ── Type declarations ────────────────────────────────────

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    collapsibleBlock: {
      /**
       * Insert a new collapsible (toggle) block at the current position.
       */
      insertCollapsibleBlock: () => ReturnType;
      /**
       * Toggle collapse state of the nearest ancestor collapsible block.
       */
      toggleCollapsible: () => ReturnType;
    };
  }
}
