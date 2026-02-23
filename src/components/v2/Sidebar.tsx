'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Layout, Star, Clock, FileText, Inbox, ChevronRight, ChevronDown, Plus, Folder as FolderIcon, Calendar, Trash2, Sun, Moon, ListTodo, Timer, Settings, Hash } from 'lucide-react';
import { Page } from '../../types/v2';
import FolderTree from '../../components/FolderTree';
import { useTaskEdit } from '../../contexts/TaskEditContext';

import CreatePageModal from './CreatePageModal';
import { SettingsModal } from '../SettingsModal';
import { SyncButton } from '../SyncButton';

import { ConfirmationModal } from '../modals/ConfirmationModal';

interface Tag {
    id: number;
    name: string;
    color: string;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 224;

export default function Sidebar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pathname = usePathname();
  const [favorites, setFavorites] = useState<Page[]>([]);
  const [recent, setRecent] = useState<Page[]>([]);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [createTargetFolderId, setCreateTargetFolderId] = useState<string | undefined>(undefined);
  const [createTargetFolderName, setCreateTargetFolderName] = useState<string | undefined>(undefined);
  
  // Collapsible state
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(true);
  const [isRecentOpen, setIsRecentOpen] = useState(true);
  const [isFoldersOpen, setIsFoldersOpen] = useState(true);
  const [isAllPagesOpen, setIsAllPagesOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(true);

  // Resize state
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Load saved width on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('leftSidebarWidth');
    if (savedWidth) {
      const parsed = parseInt(savedWidth, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        setWidth(parsed);
      }
    }
  }, []);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    localStorage.setItem('leftSidebarWidth', width.toString());
  }, [width]);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }

    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const { createTask } = useTaskEdit();
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
        setRefreshTrigger(prev => prev + 1);
        fetchData(); // Also refresh sidebar lists (Favorites/Recent/All)
    };

    window.addEventListener('pageUpdated', handleUpdate);
    return () => window.removeEventListener('pageUpdated', handleUpdate);
  }, []);

  const fetchData = async () => {
    try {
        const [favRes, recentRes, allRes, tagsRes] = await Promise.all([
            fetch('/api/v2/pages?view=favorites'),
            fetch('/api/v2/pages?view=recent'),
            fetch('/api/v2/pages?view=all'),
            fetch('/api/v2/tags')
        ]);
        
        if (favRes.ok) setFavorites(await favRes.json());
        if (recentRes.ok) setRecent(await recentRes.json());
        if (allRes.ok) setAllPages(await allRes.json());
        if (tagsRes.ok) setTags(await tagsRes.json());
    } catch (e) {
        console.error('Failed to load sidebar data', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeletePage = async (pageId: number) => {
     try {
         const res = await fetch(`/api/v2/pages?id=${pageId}`, {
             method: 'DELETE'
         });
         if (res.ok) {
             fetchData();
             // Trigger folder tree refresh via key or context?
             setRefreshTrigger(prev => prev + 1);

             if (pathname === `/page/${pageId}`) {
                 window.location.href = '/';
             }
         }
     } catch (e) {
         console.error('Delete failed', e);
     }
  };

  const openCreateModal = (folderId?: string, folderName?: string) => {
      setCreateTargetFolderId(folderId);
      setCreateTargetFolderName(folderName);
      setIsCreateModalOpen(true);
  };

  const handleCreatePageSubmit = async (title: string) => {
    try {
      const res = await fetch('/api/v2/pages', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ 
              title, 
              content: {}, 
              folderId: createTargetFolderId 
          })
      });
      if (res.ok) {
          const newPage = await res.json();
          window.location.href = `/page/${newPage.id}`;
      }
    } catch (e) {
        console.error(e);
    }
  };

  const NavItem = ({ href, icon: Icon, label, active, onDelete }: any) => (
    <div className="group relative flex items-center">
        <Link 
          href={href}
          className={`
            flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm transition-colors
            ${active 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-accent-blue font-medium' 
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            }
          `}
        >
          <Icon size={16} />
          <span className="truncate">{label}</span>
        </Link>
        
        {onDelete && (
             <button 
                 onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     onDelete();
                 }}
                 className="absolute right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                 title="Delete page"
             >
                 <Trash2 size={14} />
             </button>
        )}
    </div>
  );

  const SectionHeader = ({ label, isOpen, onToggle, onAdd }: any) => (
      <div className="flex items-center justify-between px-2 py-1 mt-2 group">
          <button 
            onClick={onToggle}
            className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text-secondary uppercase tracking-wider transition-colors"
          >
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {label}
          </button>
          {onAdd && (
              <button onClick={onAdd} className="text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all">
                  <Plus size={14} />
              </button>
          )}
      </div>
  );

  return (
    <div 
        ref={sidebarRef}
        className={`relative h-full bg-bg-secondary border-r border-border-subtle flex flex-col flex-shrink-0 transition-colors duration-200 ${isResizing ? 'select-none transition-none' : ''}`}
        style={{ width: `${width}px` }}
    >
      {/* Drag Handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 hover:w-2 cursor-col-resize z-40 group flex items-center justify-center translate-x-1/2 hover:bg-blue-500/10 transition-all"
        onMouseDown={startResizing}
      >
        <div className="w-[1px] h-full bg-border-subtle group-hover:bg-blue-500/50 transition-colors" />
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2 font-bold text-foreground text-lg mb-4">
            <Layout className="text-blue-600" />
            The Docket
        </div>

        {/* Quick Add */}
        <div className="relative">
            <input
                type="text"
                placeholder="Quick add..."
                className="w-full pl-9 pr-3 py-2 bg-bg-tertiary border border-transparent rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:bg-bg-primary focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement;
                        const value = target.value.trim();
                        if (!value) return;

                        try {
                            // Creating via API to ensure 'Inbox' context (no pageId)
                            // Or use context if available
                            await fetch('/api/v2/tasks', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ content: value })
                            });
                            
                            target.value = '';
                            // Refresh logic
                             setRefreshTrigger(prev => prev + 1);
                             // If on inbox/tasks page, they might need refresh too? 
                             // We are relying on window event from createPage but we task creation might not emit?
                             // Let's emit a global event for now or just trust navigation
                             window.dispatchEvent(new Event('taskCreated'));

                        } catch (err) {
                            console.error('Failed to quick add', err);
                        }
                    }
                }}
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                <Plus size={14} />
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-2 space-y-0.5">
            <NavItem href="/" icon={Layout} label="Dashboard" active={pathname === '/'} />
            <NavItem href="/inbox" icon={Inbox} label="Inbox" active={pathname === '/inbox'} />
            <NavItem href="/today" icon={Clock} label="Today" active={pathname === '/today'} />
            <NavItem href="/tasks" icon={ListTodo} label="All Tasks" active={pathname === '/tasks'} />
            <NavItem href="/calendar" icon={Calendar} label="Calendar" active={pathname === '/calendar'} />
            <NavItem href="/focus" icon={Timer} label="Focus" active={pathname === '/focus'} />
        </div>

        {/* Favorites */}
        <div className="mt-2">
            <SectionHeader label="Favorites" isOpen={isFavoritesOpen} onToggle={() => setIsFavoritesOpen(!isFavoritesOpen)} />
            {isFavoritesOpen && (
                <div className="px-2 space-y-0.5">
                    {favorites.length === 0 && <div className="px-3 py-1 text-xs text-gray-400 italic">No favorites</div>}
                    {favorites.map(page => (
                        <NavItem 
                            key={page.id} 
                            href={`/page/${page.id}`} 
                            icon={Star} 
                            label={page.title} 
                            active={pathname === `/page/${page.id}`}
                            onDelete={() => setPageToDelete(page)}
                        />
                    ))}
                </div>
            )}
        </div>

        {/* Recent */}
        <div className="mt-2">
            <SectionHeader label="Recent" isOpen={isRecentOpen} onToggle={() => setIsRecentOpen(!isRecentOpen)} />
            {isRecentOpen && (
                <div className="px-2 space-y-0.5">
                    {recent.map(page => (
                        <NavItem 
                            key={page.id} 
                            href={`/page/${page.id}`} 
                            icon={FileText} 
                            label={page.title} 
                            active={pathname === `/page/${page.id}`}
                            onDelete={() => setPageToDelete(page)}
                        />
                    ))}
                </div>
            )}
        </div>

        {/* Tags */}
        <div className="mt-2">
            <SectionHeader label="Tags" isOpen={isTagsOpen} onToggle={() => setIsTagsOpen(!isTagsOpen)} />
            {isTagsOpen && (
                <div className="px-2 space-y-0.5">
                    {tags.length === 0 && <div className="px-3 py-1 text-xs text-gray-400 italic">No tags</div>}
                    {tags.map(tag => (
                        <NavItem 
                            key={tag.id} 
                            href={`/tag/${tag.id}`} 
                            icon={Hash} 
                            label={tag.name} 
                            active={pathname === `/tag/${tag.id}`}
                        />
                    ))}
                </div>
            )}
        </div>

        {/* Folders */}
        <div className="mt-2">
            <SectionHeader label="Folders" isOpen={isFoldersOpen} onToggle={() => setIsFoldersOpen(!isFoldersOpen)} />
            {isFoldersOpen && (
                <div className="px-2">
                    <FolderTree 
                        onFolderSelect={(folder) => console.log('Folder selected:', folder)}
                        onPageSelect={(page) => window.location.href = `/page/${page.id}`}
                        onCreateTask={createTask}
                        onCreatePage={openCreateModal}
                        refreshTrigger={refreshTrigger}
                        onDeletePage={(pageId) => {
                            // Find page object for title? FolderTree passes ID. 
                            // We need to fetch or just use a placeholder if we don't have it.
                            // Better yet, let FolderTree handle its own deletion UI? 
                            // FolderTree HAS its own UI. Sidebar uses handleDeletePage for its lists.
                            // The lists (Recent/Favorites) use handleDeletePage.
                            const page = allPages.find(p => p.id === pageId) || recent.find(p => p.id === pageId) || favorites.find(p => p.id === pageId);
                            if (page) setPageToDelete(page);
                            else handleDeletePage(pageId); // Fallback if we can't find object for modal
                        }}
                        onMovePage={async (pageId, newFolderId) => {
                            try {
                                const res = await fetch(`/api/v2/pages?id=${pageId}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ folderId: newFolderId === '1' ? null : newFolderId })
                                });
                                if (res.ok) {
                                    setRefreshTrigger(prev => prev + 1);
                                    window.dispatchEvent(new Event('pageUpdated'));
                                }
                            } catch (e) {
                                console.error('Failed to move page', e);
                            }
                        }}
                    />
                </div>
            )}
        </div>

        {/* All Pages */}
        <div className="mt-2">
            <SectionHeader label="All Pages" isOpen={isAllPagesOpen} onToggle={() => setIsAllPagesOpen(!isAllPagesOpen)} onAdd={() => openCreateModal()} />
            {isAllPagesOpen && (
                <div className="px-2 space-y-0.5">
                     {allPages.map(page => (
                        <NavItem 
                            key={page.id} 
                            href={`/page/${page.id}`} 
                            icon={FileText} 
                            label={page.title} 
                            active={pathname === `/page/${page.id}`}
                            onDelete={() => setPageToDelete(page)}
                        />
                    ))}
                </div>
            )}
        </div>

      </div>

      <div className="p-4 border-t border-border-subtle mt-auto bg-bg-secondary space-y-2">
          {mounted && (
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="flex-1 flex items-center gap-2 p-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>
                
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 rounded-lg text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                  title="Settings"
                >
                  <Settings size={16} />
                </button>
                
                <SyncButton />
            </div>
          )}
      </div>

      <CreatePageModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreatePageSubmit}
        folderName={createTargetFolderName}
      />
      
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ConfirmationModal
        isOpen={!!pageToDelete}
        onClose={() => setPageToDelete(null)}
        onConfirm={() => pageToDelete && handleDeletePage(pageToDelete.id)}
        title="Delete Page"
        message={`Are you sure you want to delete "${pageToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
