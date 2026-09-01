import { LucideIcon } from 'lucide-react';

interface ReviewSectionProps {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  count: number;
  emptyMessage?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  alwaysShowChildren?: boolean;
}

export default function ReviewSection({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  count,
  emptyMessage,
  children,
  action,
  alwaysShowChildren,
}: ReviewSectionProps) {
  return (
    <div className="bg-bg-secondary rounded-2xl border border-border-subtle shadow-sm p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${iconBg} ${iconColor} rounded-lg`}>
            <Icon size={18} />
          </div>
          <h3 className="text-lg font-bold text-text-primary">{title}</h3>
          <span className="text-sm font-medium text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        {action}
      </div>
      {count === 0 && emptyMessage && !alwaysShowChildren && (
        <div className="text-sm text-text-muted italic py-4 text-center">
          {emptyMessage}
        </div>
      )}
      {(count > 0 || alwaysShowChildren) && children}
    </div>
  );
}
