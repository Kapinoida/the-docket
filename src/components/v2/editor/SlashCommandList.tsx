import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Image as ImageIcon 
} from 'lucide-react';

interface SlashCommandListProps {
  items: any[];
  command: any;
  editor: Editor;
}

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[200px] py-1">
      {props.items.length > 0 ? (
        props.items.map((item, index) => (
          <button
            className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm transition-colors ${
              index === selectedIndex
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            key={index}
            onClick={() => selectItem(index)}
          >
            {item.element || (
                <>
                    {/* Placeholder for icon mapping if items are simple objects */}
                    {/* We expect items to have an icon property or we map it here */}
                    {item.icon}
                    <span>{item.title}</span>
                </>
            )}
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-gray-500">No results</div>
      )}
    </div>
  );
});

SlashCommandList.displayName = 'SlashCommandList';
