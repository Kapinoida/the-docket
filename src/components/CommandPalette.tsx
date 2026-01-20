
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, FileText, CheckCircle, Home, Calendar, Hash } from 'lucide-react';
import { Page, Task } from '@/types/v2';

// Helper interface for the flat API response
interface SearchResultItem {
  id: number;
  title: string; // or content for tasks
  type: 'page' | 'task' | 'tag';
  content?: string; // for tasks
  page_id?: number;
  page_title?: string;
  name?: string; // for tags
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [pages, setPages] = React.useState<SearchResultItem[]>([]);
  const [tasks, setTasks] = React.useState<SearchResultItem[]>([]);
  const [tags, setTags] = React.useState<SearchResultItem[]>([]);
  const [loading, setLoading] = React.useState(false);

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

  React.useEffect(() => {
    if (!open) return;
    
    const fetchResults = async () => {
        if (!search) {
            setPages([]);
            setTasks([]);
            setTags([]);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/v2/search?q=${encodeURIComponent(search)}`);
            if (res.ok) {
                const data: SearchResultItem[] = await res.json();
                // The API returns a flat array. Filter by type.
                // Note: The API tries to normalize title/content into 'title', but let's be safe.
                setPages(data.filter(item => item.type === 'page'));
                setTasks(data.filter(item => item.type === 'task'));
                setTags(data.filter(item => item.type === 'tag'));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [search, open]);

  const handleSelectPage = (pageId: number) => {
      setOpen(false);
      router.push(`/page/${pageId}`);
  };

  const handleSelectTask = (task: any) => {
      if (task.page_id) {
          setOpen(false);
          router.push(`/page/${task.page_id}`);
      } else {
          console.log('Task has no page context', task);
          // Optional: Navigate to a "Task View" or similar if/when it exists
      }
  };

    const handleSelectTag = (tag: SearchResultItem) => {
        setOpen(false);
        // Navigate to search/filter page
        router.push(`/?tag=${tag.id}`);
    };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm transition-all text-text-primary">
      <div className="w-full max-w-xl bg-bg-primary rounded-xl shadow-2xl border border-border-default overflow-hidden animate-in fade-in zoom-in duration-200">
        <Command className="w-full" shouldFilter={false}>
          <div className="flex items-center border-b border-border-subtle px-3" cmdk-input-wrapper="">
            <Search className="w-5 h-5 text-text-muted mr-2" />
            <Command.Input 
                autoFocus
                placeholder="Search pages, tasks, and tags..."
                value={search}
                onValueChange={setSearch}
                className="w-full py-4 text-base bg-transparent border-none outline-none placeholder:text-text-muted text-text-primary"
            />
          </div>
          
          <Command.List className="max-h-[60vh] overflow-y-auto p-2 scroll-py-2">
            {loading && <div className="p-4 text-sm text-gray-500 text-center">Searching...</div>}
            
            {!loading && pages.length === 0 && tasks.length === 0 && tags.length === 0 && search && (
                <div className="p-4 text-sm text-gray-500 text-center">No results found.</div>
            )}

            {/* System Commands */}
            <Command.Group heading="Commands" className="px-2 py-1.5 text-xs font-semibold text-text-muted uppercase">
                <Command.Item
                    onSelect={() => {
                        setOpen(false);
                        router.push('/');
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-text-primary cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/20 aria-selected:text-accent-blue transition-colors"
                >
                    <Home className="w-4 h-4 text-text-muted" />
                    <span>Go to Dashboard</span>
                </Command.Item>
                <Command.Item
                    onSelect={() => {
                        setOpen(false);
                        router.push('/calendar');
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30 aria-selected:text-blue-700 dark:aria-selected:text-blue-300 transition-colors"
                >
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Go to Calendar</span>
                </Command.Item>
            </Command.Group>

            {tags.length > 0 && (
                <Command.Group heading="Tags" className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase mt-2">
                    {tags.map((tag) => (
                        <Command.Item
                            key={tag.id}
                            onSelect={() => handleSelectTag(tag)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30 aria-selected:text-blue-700 dark:aria-selected:text-blue-300 transition-colors"
                        >
                            <Hash className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-blue-600 dark:text-blue-400">{tag.title || tag.name}</span>
                        </Command.Item>
                    ))}
                </Command.Group>
            )}

            {pages.length > 0 && (
                <Command.Group heading="Pages" className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase mt-2">
                    {pages.map((page) => (
                        <Command.Item
                            key={page.id}
                            onSelect={() => handleSelectPage(page.id)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-200 cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30 aria-selected:text-blue-700 dark:aria-selected:text-blue-300 transition-colors"
                        >
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span>{page.title}</span>
                        </Command.Item>
                    ))}
                </Command.Group>
            )}
            
            {tasks.length > 0 && (
                <Command.Group heading="Tasks" className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase mt-2">
                    {tasks.map((task: any) => (
                        <Command.Item
                            key={task.id}
                            onSelect={() => handleSelectTask(task)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-text-primary cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/20 aria-selected:text-accent-blue transition-colors"
                        >
                            <CheckCircle className="w-4 h-4 text-text-muted" />
                            <div className="flex flex-col min-w-0">
                                <span className="truncate">{task.title || task.content}</span>
                                {task.page_title && (
                                    <span className="text-[10px] text-gray-400 truncate">in {task.page_title}</span>
                                )}
                            </div>
                        </Command.Item>
                    ))}
                </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
