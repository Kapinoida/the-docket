
import React, { useState, useEffect } from 'react';
import { X, Search, FileText } from 'lucide-react';
import { Page } from '../../types/v2';

interface MoveToPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pageId: number) => void;
}

export default function MoveToPageModal({ isOpen, onClose, onSelect }: MoveToPageModalProps) {
  const [pages, setPages] = useState<Page[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/v2/pages?view=all')
        .then(res => res.json())
        .then(data => {
            setPages(data);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredPages = pages.filter(p => 
      p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-bg-primary rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[600px] border border-border-default">
        
        {/* Header */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-bg-secondary">
          <h2 className="text-lg font-semibold text-text-primary">Move Task to Page</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border-subtle">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                    type="text"
                    placeholder="Search pages..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-accent-blue bg-bg-primary text-text-primary placeholder:text-text-muted"
                    autoFocus
                />
            </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-2">
            {loading ? (
                <div className="p-4 text-center text-gray-400 text-sm">Loading pages...</div>
            ) : filteredPages.length === 0 ? (
                 <div className="p-4 text-center text-gray-400 text-sm">No pages found</div>
            ) : (
                <div className="space-y-1">
                    {filteredPages.map(page => (
                        <button
                            key={page.id}
                            onClick={() => onSelect(page.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left group transition-colors"
                        >
                            <div className="p-2 bg-bg-tertiary rounded-lg text-text-muted group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-accent-blue transition-colors">
                                <FileText size={18} />
                            </div>
                            <div className="font-medium text-text-primary group-hover:text-accent-blue">{page.title}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
