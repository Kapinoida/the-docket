import { mergeAttributes, Node } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css'; 
import { TagList } from '../TagList';
import { PluginKey } from '@tiptap/pm/state';

export const TagExtension = Node.create({
  name: 'tag',

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
      },
      name: {
        default: null,
      },
      color: {
          default: 'blue'
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="tag"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-type': 'tag' },
        HTMLAttributes,
        { class: 'inline-flex items-center px-1.5 py-0.5 rounded text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 mx-0.5 cursor-pointer selection:bg-none' }
      ),
      `#${node.attrs.name}`,
    ];
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: new PluginKey('tagSuggestion'),
        editor: this.editor,
        char: '#',
        
        // ALLOW SPACES: This is a design decision. 
        // Standard tags (Twitter/Insta) don't allow spaces. 
        // Notion allows multi-word tags.
        // Let's stick to simple tags first (no spaces) to keep regex simple and standard.
        allowSpaces: false,

        command: ({ editor, range, props }) => {
            // increase range to include the # char? Suggestion usually handles this.
            editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: 'tag',
                attrs: props,
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run();
            
            // Trigger backend create/assign if needed?
            // Actually, we should probably handle this in the 'TagNode' component if we want to confirm it exists
            // But for now, we just insert the node.
            
            // If it's a NEW tag (isCreate is true), we should create it in DB
            if (props.isCreate) {
                fetch('/api/v2/tags', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ name: props.name })
                }).then(res => res.json()).then(tag => {
                    // Update the node attributes with real ID if needed?
                    // Currently we just store name. ID is better for renaming support later.
                });
            }
        },

        items: async ({ query }) => {
            // Fetch tags from API or keep a local cache
            // For MVP, let's fetch. Optimize later.
            try {
                // TODO: Debounce or cache this?
                const res = await fetch('/api/v2/tags');
                const allTags = await res.json();
                
                const filtered = allTags
                    .filter((tag: any) => tag.name.toLowerCase().includes(query.toLowerCase()))
                    .slice(0, 5);
                
                // Add "Create new" option if query doesn't match exactly
                if (query && !filtered.find((t: any) => t.name.toLowerCase() === query.toLowerCase())) {
                    filtered.push({ name: query, isCreate: true });
                }
                
                return filtered;
            } catch (e) {
                console.error("Failed to fetch tags", e);
                return query ? [{ name: query, isCreate: true }] : [];
            }
        },

        render: () => {
          let component: any;
          let popup: any;

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(TagList, {
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
