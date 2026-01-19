
"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Folder, FileText, Trash2 } from 'lucide-react';
import V2Editor from '../../../components/v2/editor/Editor';
import { Page, PageItem, Task } from '../../../types/v2';
import { TaskItem } from '../../../components/v2/TaskItem';

export default function PageView() {
  const params = useParams();
  const id = params?.id;
  
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetch(`/api/v2/pages?id=${id}`)
         .then(res => res.json())
         .then(data => {
             setPage(data);
             setLoading(false);
         })
         .catch(err => console.error(err));
    }
  }, [id]);

  const handleDelete = async () => {
      if (!page || !confirm(`Delete page "${page.title}"?\nThis action cannot be undone.`)) return;
      
      try {
          const res = await fetch(`/api/v2/pages?id=${page.id}`, { method: 'DELETE' });
          if (res.ok) {
              window.location.href = '/';
          }
      } catch (err) {
          console.error("Failed to delete page", err);
      }
  };

  const handleTitleBlur = async (e: React.FocusEvent<HTMLHeadingElement>) => {
      const newTitle = e.currentTarget.textContent;
      if (!page || !newTitle || newTitle === page.title) return;

      try {
        const res = await fetch(`/api/v2/pages?id=${page.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        });

        if (res.ok) {
          const updatedPage = await res.json();
          setPage({ ...page, title: updatedPage.title });
        }
      } catch (err) {
        console.error("Failed to update page title", err);
      }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLHeadingElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handleTaskToggle = async (taskId: number) => {
    if (!page || !page.items) return;

    // Optimistic Update
    const updatedItems = page.items.map(pItem => {
        if (pItem.type === 'task' && pItem.item && (pItem.item as Task).id === taskId) {
            const task = pItem.item as Task;
            const newStatus = (task.status === 'done' ? 'todo' : 'done') as any; // Cast for TS
            return {
                ...pItem,
                item: { ...task, status: newStatus }
            };
        }
        return pItem;
    });

    setPage({ ...page, items: updatedItems });

    // API Call
    const targetItem = page.items.find(pItem => pItem.type === 'task' && (pItem.item as Task).id === taskId);
    if (targetItem && targetItem.item) {
        const task = targetItem.item as Task;
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        await fetch(`/api/v2/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
    }
  };

  if (loading) return <div className="p-8">Loading Page...</div>;
  if (!page) return <div className="p-8">Page not found</div>;

  const contextTasks = page.items?.filter(i => i.type === 'task' && i.item) || [];
  const contextPages = page.items?.filter(i => i.type === 'page' && i.item) || [];

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-6xl mx-auto pt-8 px-4 md:px-8">
        
        {/* Header Row: Breadcrumbs + Actions */}
        <div className="flex items-center justify-between mb-4">
             {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-text-secondary">
                {page.folder && (
                    <div className="flex items-center gap-1">
                        <Folder size={14} />
                        <span>{page.folder.name}</span>
                    </div>
                )}
                
                {page.folder && page.parent_page && <ChevronRight size={14} className="text-gray-300" />}
                
                {page.parent_page && (
                    <Link href={`/page/${page.parent_page.id}`} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                        <FileText size={14} />
                        <span>{page.parent_page.title}</span>
                    </Link>
                )}
                
                {(page.folder || page.parent_page) && <ChevronRight size={14} className="text-text-muted" />}
                
                <div className="font-medium text-text-primary line-clamp-1">
                    {page.title}
                </div>
            </div>

            {/* Actions */}
            <button 
                onClick={handleDelete}
                className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete Page"
            >
                <Trash2 size={18} />
            </button>
        </div>

        <h1 
            className="text-4xl font-bold mb-4 outline-none placeholder:text-text-muted text-text-primary" 
            contentEditable 
            suppressContentEditableWarning
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
        >
            {page.title}
        </h1>
      </div>
      
      <V2Editor pageId={page.id} initialContent={page.content} />

      {/* Context Links Section */}
      <div className="max-w-4xl mx-auto mt-12 px-8 pb-32">
        {(contextTasks.length > 0 || contextPages.length > 0) && (
            <>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Page Context</h2>
                
                {/* Linked Pages */}
                {contextPages.length > 0 && (
                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {contextPages.map(pItem => {
                            const subPage = pItem.item as Page;
                            return (
                                <Link 
                                    key={pItem.id} 
                                    href={`/page/${subPage.id}`}
                                    className="block p-4 rounded-xl border border-border-subtle hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                >
                                    <div className="font-medium text-text-primary">{subPage.title}</div>
                                    <div className="text-xs text-text-secondary mt-1">Linked Page</div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Linked Tasks */}
                {contextTasks.length > 0 && (
                    <div className="space-y-2">
                        {contextTasks.map(pItem => (
                            <TaskItem 
                                key={pItem.id} 
                                task={pItem.item as Task} 
                                onToggle={handleTaskToggle}
                                // Read-only in list view for now, or implement onUpdate if needed
                            />
                        ))}
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
}
