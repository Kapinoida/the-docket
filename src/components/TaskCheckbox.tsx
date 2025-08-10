'use client';

import { Check } from 'lucide-react';

interface TaskCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export default function TaskCheckbox({
  checked,
  onChange,
  onClick,
  className = '',
  size = 'md',
  disabled = false
}: TaskCheckboxProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const checkSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onChange(!checked);
    }
    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]} 
        rounded-sm border-2 flex items-center justify-center transition-all duration-200 ease-in-out
        ${checked 
          ? 'bg-green-500 border-green-500 text-white hover:bg-green-600 hover:border-green-600' 
          : 'bg-transparent border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800
        ${className}
      `}
      type="button"
      aria-checked={checked}
      role="checkbox"
    >
      {checked && (
        <Check 
          className={`${checkSizeClasses[size]} stroke-[3]`} 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      )}
    </button>
  );
}