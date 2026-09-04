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
              choice: '',
              reasoning: '',
              revisit_date: null,
              outcome: '',
              created_at: now,
              updated_at: now,
            },
          });
        },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    decision: {
      insertDecision: (attrs?: Partial<{ title: string; context: string }>) => ReturnType;
    };
  }
}
