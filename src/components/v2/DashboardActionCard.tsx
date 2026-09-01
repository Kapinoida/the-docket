import { LucideIcon } from 'lucide-react';

interface DashboardActionCardProps {
  count: number;
  label: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  countColor: string;
  href?: string;
  onClick?: () => void;
  emptyMessage?: string;
  children?: React.ReactNode;
}

export default function DashboardActionCard({
  count,
  label,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  countColor,
  href,
  onClick,
  emptyMessage,
  children,
}: DashboardActionCardProps) {
  const content = (
    <div className="bg-bg-secondary rounded-2xl border border-border-subtle shadow-sm p-4 md:p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${iconBg} ${iconColor} rounded-lg`}>
            <Icon size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary">{label}</div>
            <div className="text-xs text-text-muted">{description}</div>
          </div>
        </div>
        <div className={`text-2xl font-bold ${countColor} tabular-nums`}>{count}</div>
      </div>
      {count === 0 && emptyMessage && (
        <div className="text-xs text-text-muted italic">{emptyMessage}</div>
      )}
      {count > 0 && children}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block hover:shadow-md transition-shadow">
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button onClick={onClick} className="block w-full text-left hover:shadow-md transition-shadow">
        {content}
      </button>
    );
  }
  return content;
}
