import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FileText, Plus } from 'lucide-react';

interface Page {
  id: number;
  title: string;
  folder_id?: number | null;
}

export const PageLinkList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pages, setPages] = useState<Page[]>([]);

  useEffect(() => {
    const fetchPages = async () => {
      if (props.query && props.query.length > 0) {
        try {
          const response = await fetch(`/api/v2/pages?search=${encodeURIComponent(props.query)}`);
          if (response.ok) {
            const data = await response.json();
            setPages(data);
          }
        } catch (error) {
          console.error('Failed to fetch pages:', error);
          setPages([]);
        }
      } else {
        setPages([]);
      }
    };

    fetchPages();
  }, [props.query]);

  const selectItem = (index: number) => {
    if (index < pages.length) {
      const page = pages[index];
      props.command({ pageId: page.id, tempTitle: null });
    } else if (index === pages.length) {
      // Create new page
      props.command({ pageId: null, tempTitle: props.query });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + pages.length) % (pages.length + 1));
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % (pages.length + 1));
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => () => setSelectedIndex(0), [props.query]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden max-h-80 overflow-y-auto">
      {pages.length === 0 && props.query ? (
        <div className="p-2 text-sm text-gray-500 dark:text-gray-400">
          No pages found
        </div>
      ) : (
        <>
          {pages.map((page, index) => (
            <button
              key={page.id}
              className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
              onClick={() => selectItem(index)}
            >
              <FileText size={16} className="text-gray-400" />
              <span className="text-gray-900 dark:text-gray-100">{page.title}</span>
            </button>
          ))}
          {props.query && (
            <button
              className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700 ${
                selectedIndex === pages.length ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
              onClick={() => selectItem(pages.length)}
            >
              <Plus size={16} className="text-blue-500" />
              <span className="text-gray-900 dark:text-gray-100">
                Create new page: <strong>{props.query}</strong>
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
});

PageLinkList.displayName = 'PageLinkList';
