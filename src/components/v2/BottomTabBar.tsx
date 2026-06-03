'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Clock, Inbox, Layout, ListTodo } from 'lucide-react';

const tabs = [
  { href: '/today', icon: Clock, label: 'Today' },
  { href: '/inbox', icon: Inbox, label: 'Inbox' },
  { href: '/', icon: Layout, label: 'Dashboard' },
  { href: '/tasks', icon: ListTodo, label: 'Tasks' },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary border-t border-border-subtle flex items-center justify-around"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
    >
      {tabs.map(({ href, icon: Icon, label }) => {
        const isActive = href === '/'
          ? pathname === '/'
          : pathname.startsWith(href);

        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-h-[52px] min-w-[56px] transition-colors ${
              isActive
                ? 'text-accent-blue'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[11px] font-medium ${isActive ? 'text-accent-blue' : ''}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
