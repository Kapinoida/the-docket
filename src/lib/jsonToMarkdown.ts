import { Editor } from '@tiptap/core';
import { Markdown } from 'tiptap-markdown';
import StarterKit from '@tiptap/starter-kit';
import { TaskExtension } from '@/components/v2/editor/extensions/TaskExtension';
import { PageLinkExtension } from '@/components/v2/editor/extensions/PageLinkExtension';
import { TagExtension } from '@/components/v2/editor/extensions/TagExtension';

export function jsonToMarkdown(content: any): string {
  if (!content) return '';
  
  const editor = new Editor({
    extensions: [
      StarterKit.configure({
          codeBlock: false,
      }),
      TaskExtension,
      PageLinkExtension,
      TagExtension,
      Markdown.configure({
        html: false,
        transformCopiedText: true,
        transformPastedText: true,
      })
    ],
    content: content,
  });

  // @ts-ignore
  const markdown = editor.storage.markdown.getMarkdown();
  editor.destroy();
  
  return markdown;
}
