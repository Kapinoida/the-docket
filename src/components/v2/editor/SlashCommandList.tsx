import React, { forwardRef, useEffect, useImperativeHandle, useState, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { GROUP_LABELS, type SlashCommandItem, type CommandGroup } from './extensions/SlashCommand';

interface SlashCommandListProps {
  items: any[];
  command: any;
  editor: Editor;
}

const GROUP_ORDER: CommandGroup[] = ['basic', 'lists', 'advanced', 'media'];

export const SlashCommandList = forwardRef((props: SlashCommandListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

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

  // Group the items, preserving their original indices so selectedIndex stays valid
  const groupedItems = useMemo(() => {
    const groups: { group: CommandGroup; items: { item: any; index: number }[] }[] = [];
    props.items.forEach((item, index) => {
      const g = (item as SlashCommandItem).group || 'basic';
      let bucket = groups.find(b => b.group === g);
      if (!bucket) {
        bucket = { group: g, items: [] };
        groups.push(bucket);
      }
      bucket.items.push({ item, index });
    });
    // Sort groups by GROUP_ORDER
    groups.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
    return groups;
  }, [props.items]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[240px] py-1">
      {props.items.length > 0 ? (
        <>
          {groupedItems.map((g, gi) => (
            <div key={g.group}>
              {gi > 0 && <div className="border-t border-gray-100 dark:border-gray-700 my-1 mx-2" />}
              <div className="px-3 pt-1.5 pb-0.5">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {GROUP_LABELS[g.group] || g.group}
                </span>
              </div>
              {g.items.map(({ item, index }) => (
                <button
                  className={`flex items-start gap-2.5 w-full text-left px-3 py-1.5 transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  key={index}
                  onClick={() => selectItem(index)}
                >
                  <span className="flex-shrink-0 mt-0.5 text-gray-400 dark:text-gray-500">
                    {item.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium">{item.title}</span>
                    {item.description && (
                      <span className="block text-xs text-gray-400 dark:text-gray-500 truncate">
                        {item.description}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ))}
          <div className="flex items-center justify-end gap-2 px-3 pt-1.5 pb-0.5 mt-1 border-t border-gray-100 dark:border-gray-700 text-[10px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-0.5">
              <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">↑</kbd>
              <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-0.5">
              <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">↵</kbd>
              to select
            </span>
            <span className="flex items-center gap-0.5">
              <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">esc</kbd>
              to dismiss
            </span>
          </div>
        </>
      ) : (
        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No results</div>
      )}
    </div>
  );
});

SlashCommandList.displayName = 'SlashCommandList';