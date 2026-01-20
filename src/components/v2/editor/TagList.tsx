import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

interface TagListProps {
  items: any[];
  command: (item: any) => void;
  query: string;
}

export const TagList = forwardRef((props: TagListProps, ref) => {
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

  if (props.items.length === 0) {
      return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden p-2 min-w-[180px]">
              <div className="text-sm text-gray-500 dark:text-gray-400 px-2 py-1">
                  Start typing to create a tag...
              </div>
          </div>
      )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden py-1 min-w-[180px] max-h-[300px] overflow-y-auto">
      {props.items.map((item, index) => (
        <button
          key={index}
          className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm transition-colors
            ${index === selectedIndex 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }
          `}
          onClick={() => selectItem(index)}
        >
          {item.isCreate ? (
              <>
                  <span className="w-5 h-5 flex items-center justify-center rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 font-bold text-xs">
                      +
                  </span>
                  <span>Create tag <strong>{item.name}</strong></span>
              </>
          ) : (
             <>
                <span className={`w-3 h-3 rounded-full ${item.color === 'blue' ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                <span>{item.name}</span>
             </>
          )}
        </button>
      ))}
    </div>
  );
});

TagList.displayName = 'TagList';
