'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Library, ListVideo, Compass } from 'lucide-react';

export default function MediaHeader() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/media') {
      return pathname === '/media';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="media-header">
      <div className="media-header-nav">
        <Link
          href="/media"
          className={`media-header-link ${isActive('/media') && !isActive('/media/discover') ? 'active' : ''}`}
        >
          <Library size={16} />
          <span>Library</span>
        </Link>
        <Link
          href="/up-next"
          className={`media-header-link ${isActive('/up-next') ? 'active' : ''}`}
        >
          <ListVideo size={16} />
          <span>Up Next</span>
        </Link>
        <Link
          href="/media/discover"
          className={`media-header-link ${isActive('/media/discover') ? 'active' : ''}`}
        >
          <Compass size={16} />
          <span>Discover</span>
        </Link>
      </div>
    </div>
  );
}
