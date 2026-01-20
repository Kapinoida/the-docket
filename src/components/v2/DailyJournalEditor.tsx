
"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { common, createLowlight } from 'lowlight';
import { TaskExtension } from './editor/extensions/TaskExtension';
import { PageLinkExtension } from './editor/extensions/PageLinkExtension';
import { SlashCommand } from './editor/extensions/SlashCommand';
import { TagExtension } from './editor/extensions/TagExtension';
import { useEffect, useState, useRef } from 'react';
import { Save, ExternalLink } from 'lucide-react';
import { EditorToolbar } from './editor/EditorToolbar';
import { GlobalDragHandle } from './editor/GlobalDragHandle';

const lowlight = createLowlight(common);

export default function DailyJournalEditor() {
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<any>(null);
  const [journalPageId, setJournalPageId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [todayDate, setTodayDate] = useState<string>('');
  
  // Use ref to track if component is mounted to prevent state updates on unmount
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    fetchJournal();
    return () => { mounted.current = false; };
  }, []);

  const fetchJournal = async () => {
    try {
      const res = await fetch('/api/v2/daily-journal');
      if (res.ok) {
        const data = await res.json();
        if (mounted.current) {
            setJournalPageId(data.id);
            setContent(data.todayContent);
            setTodayDate(data.date);
            setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Failed to load journal', error);
      setIsLoading(false);
    }
  };

  const handleSave = async (newContent: any) => {
    setIsSaving(true);
    try {
      await fetch('/api/v2/daily-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
      if (mounted.current) {
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error('Failed to save journal', err);
    } finally {
      if (mounted.current) {
        setIsSaving(false);
      }
    }
  };

  const editor = useEditor({
    editable: !isLoading && !!journalPageId,
    extensions: [
      StarterKit.configure(),
      Placeholder.configure({
          placeholder: 'Write about your day...',
      }),
      TaskExtension.configure({
          pageId: journalPageId || 0, // Fallback, though we wait for ID usually
      }),
      PageLinkExtension.configure({
          currentPageId: journalPageId || 0
      }),
      TiptapImage.configure({
          inline: true,
          allowBase64: true,
      }),
      Highlight,
      Typography,
      Link.configure({
          openOnClick: false,
          autolink: true,
      }),
      CodeBlockLowlight.configure({
          lowlight,
      }),
      Table.configure({
          resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
          types: ['heading', 'paragraph'],
      }),
      SlashCommand,
      TagExtension,
    ],
    content: content, 
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[300px] p-4 rounded-xl border border-transparent focus:border-orange-500/20 bg-white dark:bg-gray-800/50 transition-all',
      },
    },
    onUpdate: ({ editor }) => {
       handleSave(editor.getJSON());
    },
  }, [journalPageId, content]); // Re-create editor when data loads

  if (isLoading || !journalPageId) {
      return <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800/50 rounded-xl"></div>;
  }

  return (
    <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <span>Daily Log</span>
                <span className="text-sm font-normal text-text-muted bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    {todayDate}
                </span>
            </h2>
            
            <div className="flex items-center gap-4 text-sm">
                 <div className="text-text-muted">
                    {isSaving ? (
                        <span className="flex items-center gap-1 text-orange-500"><Save size={14} className="animate-pulse" /> Saving...</span>
                    ) : (
                        <span>{lastSaved ? `Saved ${lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}</span>
                    )}
                 </div>
                 
                 <a 
                    href={`/page/${journalPageId}`}
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                 >
                     View Full Journal <ExternalLink size={14} />
                 </a>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
             <div className="px-4 pt-2 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <EditorToolbar editor={editor} />
             </div>
             <EditorContent editor={editor} />
             {journalPageId && editor && <GlobalDragHandle editor={editor} pageId={journalPageId} />}
        </div>
        
        <div className="mt-2 text-xs text-center text-text-muted">
            Entries are automatically appended to your master Journal page.
        </div>
    </div>
  );
}
