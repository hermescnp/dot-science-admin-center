import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { ModeratedItem, ModerationStatus } from '../data/moderation';

const STATS: {
  id: ModerationStatus | 'all';
  label: string;
  icon: keyof typeof Icons;
  tone: string;
}[] = [
  { id: 'all', label: 'Total items', icon: 'layoutGrid', tone: 'text-white' },
  { id: 'active', label: 'Active', icon: 'circleCheck', tone: 'text-emerald-300' },
  { id: 'reported', label: 'Reported', icon: 'flag', tone: 'text-amber-300' },
  { id: 'banned', label: 'Banned', icon: 'gavel', tone: 'text-red-400' }
];

interface ModerationStatsProps {
  items: ModeratedItem[];
  activeStatuses: ModerationStatus[];
  onSelect: (status: ModerationStatus | 'all') => void;
}

export function ModerationStats({ items, activeStatuses, onSelect }: ModerationStatsProps) {
  const counts = { all: items.length, active: 0, reported: 0, banned: 0 };
  for (const item of items) counts[item.status]++;
  const onlyStatus = activeStatuses.length === 1 ? activeStatuses[0] : null;

  return (
    <div className='grid grid-cols-2 gap-2 px-4 pb-4 md:grid-cols-4 md:px-6'>
      {STATS.map((stat) => {
        const Icon = Icons[stat.icon];
        const isActive = stat.id === 'all' ? activeStatuses.length === 0 : onlyStatus === stat.id;
        return (
          <button
            key={stat.id}
            type='button'
            onClick={() => onSelect(stat.id)}
            aria-pressed={isActive}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
              isActive
                ? 'border-[var(--agora-accent)]/60 bg-[var(--agora-accent)]/10'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
            )}
          >
            <Icon className={cn('size-5 shrink-0', stat.tone)} />
            <span>
              <span className='block text-xl leading-none font-semibold tabular-nums'>
                {counts[stat.id]}
              </span>
              <span className='text-xs text-white/50'>{stat.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
