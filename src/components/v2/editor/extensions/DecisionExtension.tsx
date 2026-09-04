import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import DecisionBlock, { generateId } from '../DecisionBlock';

export const DecisionExtension = Node.create({
  name: 'decision',

  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-decision-id'),
        renderHTML: (attrs) => {
          if (attrs.id) return { 'data-decision-id': attrs.id };
          return {};
        },
      },
      title: {
        default: '',
      },
      status: {
        default: 'active',
        parseHTML: (element) => element.getAttribute('data-status') || 'active',
        renderHTML: (attrs) => {
          return { 'data-status': attrs.status };
        },
      },
      context: {
        default: '',
      },
      options: {
        default: '',
      },
      criteria: {
        default: '',
      },
      structured_criteria: {
        default: [],
      },
      choice: {
        default: '',
      },
      reasoning: {
        default: '',
      },
      revisit_date: {
        default: null,
      },
      outcome: {
        default: '',
      },
      created_at: {
        default: null,
      },
      updated_at: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="decision"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'decision' }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DecisionBlock);
  },

  addCommands() {
    return {
      insertDecision:
        (attrs?: Partial<{ title: string; context: string }>) =>
        ({ commands }) => {
          const now = new Date().toISOString();
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: generateId(),
              title: attrs?.title || '',
              status: 'active',
              context: attrs?.context || '',
              options: '',
              criteria: '',
              structured_criteria: [],
              choice: '',
              reasoning: '',
              revisit_date: null,
              outcome: '',
              created_at: now,
              updated_at: now,
            },
          });
        },
      convertToDecision:
        () =>
        ({ editor, commands }) => {
          const { state } = editor;
          const { selection } = state;
          const { from, to } = selection;

          // Get the text content of the selection or current block
          let text = '';
          if (from === to) {
            // No selection, get the current block
            const $pos = state.doc.resolve(from);
            const block = $pos.parent;
            text = block.textContent;
          } else {
            // Get selected text
            text = state.doc.textBetween(from, to, '\n');
          }

          if (!text.trim()) {
            return false;
          }

          // Split into lines
          const lines = text.split('\n').filter(line => line.trim());
          if (lines.length === 0) {
            return false;
          }

          // First line becomes title, rest becomes context
          const title = lines[0].trim();
          const context = lines.slice(1).join('\n').trim();

          // Determine the range to replace
          let replaceFrom = from;
          let replaceTo = to;

          if (from === to) {
            // Replace the entire current block
            const $pos = state.doc.resolve(from);
            const block = $pos.parent;
            replaceFrom = $pos.before($pos.depth);
            replaceTo = $pos.after($pos.depth);
          } else {
            // Expand selection to block boundaries
            const $from = state.doc.resolve(from);
            const $to = state.doc.resolve(to);
            replaceFrom = $from.before($from.depth);
            replaceTo = $to.after($to.depth);
          }

          const now = new Date().toISOString();
          return commands.insertContentAt(
            { from: replaceFrom, to: replaceTo },
            {
              type: this.name,
              attrs: {
                id: generateId(),
                title,
                status: 'active',
                context,
                options: '',
                criteria: '',
                structured_criteria: [],
                choice: '',
                reasoning: '',
                revisit_date: null,
                outcome: '',
                created_at: now,
                updated_at: now,
              },
            }
          );
        },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    decision: {
      insertDecision: (attrs?: Partial<{ title: string; context: string }>) => ReturnType;
      convertToDecision: () => ReturnType;
    };
  }
}
