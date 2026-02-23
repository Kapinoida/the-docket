const { generateMarkdown } = require('tiptap-markdown');
const StarterKit = require('@tiptap/starter-kit');

const json = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Hello World' }]
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'This is a test' }]
    }
  ]
};

console.log(generateMarkdown(json, [StarterKit.default]));
