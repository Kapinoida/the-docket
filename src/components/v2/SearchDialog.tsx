'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, FileText, CheckSquare, Hash } from 'lucide-react';

// Simplified type for search results
interface SearchResult {
  id: number;
  title: string;
  type: 'page' | 'task' | 'tag';
}

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const useRouter = require('next/navigation').useRouter; // Ensure we use the hook
  const router = useRouter();

  // Toggle with Cmd+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search API call debounced
  React.useEffect(() => {
    if (query.length === 0) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v2/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: SearchResult) => {
    setOpen(false);
    if (item.type === 'page') {
      router.push(`/page/${item.id}`);
    } else if (item.type === 'tag') {
        // Navigate to search page filtered by tag?
        // Or generic search result page?
        // For now, let's assume we have a way to filter pages by tag.
        // Simple approach: Navigate to Filtered Page List
        // router.push(`/?tag=${item.id}`);
        // Actually, current home page doesn't support tag query param filtering yet in UI (DashboardView).
        // Let's implement a quick client-side filter or basic alert for now.
        console.log('Selected tag', item);
        router.push(`/?tag=${item.id}`); // We will need to update Dashboard to handle this
    } else {
      console.log('Selected task', item);
    }
  };

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen}
      label="Global Search"
      className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 p-2 z-[9999]"
    >
      <div className="flex items-center border-b border-gray-100 dark:border-gray-800 px-3 pb-2 mb-2">
        <Search className="w-5 h-5 text-gray-400 mr-2" />
        <Command.Input 
            value={query}
            onValueChange={setQuery}
            placeholder="Search pages, tasks, and tags..."
            className="flex-1 outline-none text-lg bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
      </div>

      <Command.List className="max-h-[300px] overflow-y-auto px-1 scroll-py-1">
        <Command.Empty className="py-6 text-center text-sm text-gray-500">
            No results found.
        </Command.Empty>

        {results.length > 0 && (
            <Command.Group heading="Results" className="text-xs font-medium text-gray-500 mb-2">
                {results.map((item) => (
                    <Command.Item
                        key={`${item.type}-${item.id}`}
                        value={`${item.title} ${item.id}`} 
                        onSelect={() => handleSelect(item)}
                        className="flex items-center gap-3 px-2 py-3 rounded-lg cursor-pointer aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-900/20 aria-selected:text-indigo-900 dark:aria-selected:text-indigo-100 transition-colors"
                    >
                        {item.type === 'page' ? (
                            <FileText size={16} className="text-gray-400" />
                        ) : item.type === 'tag' ? (
                            <Hash size={16} className="text-blue-500" />
                        ) : (
                            <CheckSquare size={16} className="text-gray-400" />
                        )}
                        <span className="truncate">
                            {item.type === 'tag' ? <span className="text-blue-600 font-medium">{item.title}</span> : item.title}
                        </span>
                        {item.type === 'tag' && <span className="ml-auto text-xs text-gray-400">Tag</span>}
                    </Command.Item>
                ))}
            </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
