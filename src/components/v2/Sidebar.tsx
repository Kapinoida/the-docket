'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Layout, Star, Clock, FileText, Inbox, ChevronRight, ChevronDown, Plus, Folder as FolderIcon, Calendar, Trash2, Sun, Moon, ListTodo, Timer, Settings } from 'lucide-react';
import { Page } from '../../types/v2';
import FolderTree from '../../components/FolderTree';
import { useTaskEdit } from '../../contexts/TaskEditContext';

import CreatePageModal from './CreatePageModal';
import { SettingsModal } from '../SettingsModal';
import { SyncButton } from '../SyncButton';

export default function Sidebar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pathname = usePathname();
  const [favorites, setFavorites] = useState<Page[]>([]);
  const [recent, setRecent] = useState<Page[]>([]);
  const [allPages, setAllPages] = useState<Page[]>([]);
  
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

  const { createTask } = useTaskEdit();
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchData = async () => {
    try {
        const [favRes, recentRes, allRes] = await Promise.all([
            fetch('/api/v2/pages?view=favorites'),
            fetch('/api/v2/pages?view=recent'),
            fetch('/api/v2/pages?view=all')
        ]);
        
        if (favRes.ok) setFavorites(await favRes.json());
        if (recentRes.ok) setRecent(await recentRes.json());
        if (allRes.ok) setAllPages(await allRes.json());
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
            flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
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
                     if (confirm(`Delete "${label}"?`)) {
                        onDelete();
                     }
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
      <div className="flex items-center justify-between px-3 py-2 mt-4 group">
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
    <div className="w-64 h-full bg-bg-secondary border-r border-border-subtle flex flex-col flex-shrink-0 transition-colors duration-200">
      <div className="p-4">
        <div className="flex items-center gap-2 font-bold text-foreground text-lg">
            <Layout className="text-blue-600" />
            The Docket
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
                            onDelete={() => handleDeletePage(page.id)}
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
                            onDelete={() => handleDeletePage(page.id)}
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
                        onDeletePage={handleDeletePage}
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
                            onDelete={() => handleDeletePage(page.id)}
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
    </div>
  );
}
