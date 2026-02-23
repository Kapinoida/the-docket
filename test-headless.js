const { Editor } = require('@tiptap/core');
const StarterKit = require('@tiptap/starter-kit');
const { Markdown } = require('tiptap-markdown');

const editor = new Editor({
  extensions: [StarterKit, Markdown],
  content: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Hello World' }]
      }
    ]
  }
});

console.log(editor.storage.markdown.getMarkdown());
