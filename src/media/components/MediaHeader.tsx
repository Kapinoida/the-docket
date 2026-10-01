'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Library, ListVideo, Search } from 'lucide-react';

export default function MediaHeader() {
  const pathname = usePathname();

  const links = [
    { href: '/media', label: 'Library', icon: Library, match: '/media' },
    { href: '/up-next', label: 'Up Next', icon: ListVideo, match: '/up-next' },
    { href: '/media/discover', label: 'Discover', icon: Search, match: '/media/discover' },
  ];

  return (
    <nav className="media-header">
      {links.map(({ href, label, icon: Icon, match }) => {
        const isActive = pathname === match || (match !== '/media' && pathname.startsWith(match));
        return (
          <Link
            key={href}
            href={href}
            className={`media-header-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
