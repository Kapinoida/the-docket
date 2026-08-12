interface FiltersProps {
  status: string | undefined;
  league: string | undefined;
  dateRange: string | undefined;
  onStatusChange: (status: string | undefined) => void;
  onLeagueChange: (league: string | undefined) => void;
  onDateRangeChange: (dateRange: string | undefined) => void;
}

const statuses = [
  { value: undefined, label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'recording', label: 'Recording' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const leagues = [
  { value: undefined, label: 'All Leagues' },
  { value: 'eng.1', label: 'Premier League' },
  { value: 'usa.1', label: 'MLS' },
];

const dateRanges = [
  { value: undefined, label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

export default function Filters({
  status,
  league,
  dateRange,
  onStatusChange,
  onLeagueChange,
  onDateRangeChange,
}: FiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
      <select
        value={status || ''}
        onChange={(e) => onStatusChange(e.target.value || undefined)}
        className="min-h-[44px] rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-border-accent focus:outline-none"
      >
        {statuses.map((s) => (
          <option key={s.label} value={s.value || ''}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={league || ''}
        onChange={(e) => onLeagueChange(e.target.value || undefined)}
        className="min-h-[44px] rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-border-accent focus:outline-none"
      >
        {leagues.map((l) => (
          <option key={l.label} value={l.value || ''}>
            {l.label}
          </option>
        ))}
      </select>

      <select
        value={dateRange || ''}
        onChange={(e) => onDateRangeChange(e.target.value || undefined)}
        className="min-h-[44px] rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-border-accent focus:outline-none"
      >
        {dateRanges.map((d) => (
          <option key={d.label} value={d.value || ''}>
            {d.label}
          </option>
        ))}
      </select>

      {(status || league || dateRange) && (
        <button
          onClick={() => {
            onStatusChange(undefined);
            onLeagueChange(undefined);
            onDateRangeChange(undefined);
          }}
          className="min-h-[44px] rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-secondary hover:bg-bg-tertiary"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
