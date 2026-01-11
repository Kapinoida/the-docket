'use client';
import { useEffect, useState } from 'react';
import { Page } from '@/types/v2';
import { FileText, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RecentNotes({ onNoteSelect }: { onNoteSelect: (page: Page) => void }) {
  const [notes, setNotes] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v2/pages?view=recent')
      .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed');
      })
      .then(data => {
          setNotes(data);
          setLoading(false);
      })
      .catch(e => {
          console.error(e);
          setLoading(false);
      });
  }, []);

  if (loading) {
      return <div className="text-sm text-text-muted animate-pulse">Loading recent notes...</div>;
  }

  if (notes.length === 0) {
      return <div className="text-text-muted text-sm italic">No recent notes found</div>;
  }

  return (
    <div className="space-y-2">
      {notes.map(note => (
        <button
          key={note.id}
          onClick={() => onNoteSelect(note)}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
        >
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
            <FileText size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">{note.title}</h4>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock size={12} />
                <span>{formatDistanceToNow(new Date(note.updated_at))} ago</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
