'use client';

import { Calendar } from 'lucide-react';
import type { Holiday } from '@/types';

interface HolidayCardProps {
  holiday: Holiday;
  variant?: 'allday' | 'compact';
  className?: string;
}

export function HolidayCard({ holiday, variant = 'allday', className = '' }: HolidayCardProps) {
  if (variant === 'compact') {
    return (
      <div
        className={`p-0.5 px-1.5 rounded text-[10px] truncate bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 ${className}`}
        title={holiday.name}
      >
        <Calendar size={10} className="inline mr-0.5" />
        {holiday.name}
      </div>
    );
  }

  return (
    <div
      className={`px-2 py-1 rounded text-xs border bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30 ${className}`}
      title={holiday.name}
    >
      <Calendar size={12} className="inline mr-1" />
      {holiday.name}
    </div>
  );
}
