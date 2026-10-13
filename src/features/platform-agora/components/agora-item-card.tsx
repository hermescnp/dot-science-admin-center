'use client';

import { Icons } from '@/components/icons';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  VISIBILITIES,
  hash,
  reasonLabel,
  reportCount,
  type ModeratedItem
} from '../data/moderation';
import { ItemActionsMenu } from './moderation-actions';
import { useModeration } from './moderation-context';

/** Deterministic accent gradient so every dummy item gets its own cover without images. */
export function AgoraCover({
  item,
  className,
  initialClassName
}: {
  item: ModeratedItem;
  className?: string;
  initialClassName?: string;
}) {
  const h = hash(item.id);
  const angle = 100 + (h % 140);
  const stop = 20 + (h % 45);
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        backgroundImage: `radial-gradient(circle at ${h % 100}% ${(h >> 3) % 100}%, color-mix(in oklab, var(--agora-accent) 55%, transparent), transparent 60%), linear-gradient(${angle}deg, var(--agora-secondary) ${stop}%, #07111d)`
      }}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-1 -bottom-4 text-7xl font-bold text-white/10 select-none',
          initialClassName
        )}
      >
        {item.title.charAt(0)}
      </span>
    </div>
  );
}

export function StatusBadge({ item }: { item: ModeratedItem }) {
  if (item.status === 'banned') {
    return (
      <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[0.65rem] font-medium text-red-300'>
        <Icons.gavel className='size-3' />
        Banned{item.ban ? ` · ${reasonLabel(item.ban.reason)}` : ''}
      </span>
    );
  }
  if (item.status === 'reported') {
    return (
      <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[0.65rem] font-medium text-amber-300'>
        <Icons.flag className='size-3' />
        {reportCount(item)} reports
      </span>
    );
  }
  return (
    <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[0.65rem] font-medium text-emerald-300'>
      <Icons.circleCheck className='size-3' />
      Active
    </span>
  );
}

export function OwnerChip({ item, className }: { item: ModeratedItem; className?: string }) {
  const initials = item.owner.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5', className)} title={item.owner.email}>
      <span className='flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--agora-accent)]/20 text-[0.55rem] font-semibold text-[var(--agora-accent)]'>
        {initials}
      </span>
      <span className='truncate'>{item.owner.name}</span>
    </span>
  );
}

export function VisibilityLabel({ item }: { item: ModeratedItem }) {
  const visibility = VISIBILITIES.find((v) => v.value === item.visibility);
  if (!visibility) return null;
  const Icon = Icons[visibility.icon];
  return (
    <span className='inline-flex items-center gap-1'>
      <Icon className='size-3' />
      {visibility.label}
    </span>
  );
}

export function UploadedLabel({ item }: { item: ModeratedItem }) {
  return <span>{formatDate(item.uploadedAt, { month: 'short' })}</span>;
}

export function ItemSelect({ item, className }: { item: ModeratedItem; className?: string }) {
  const {
    state: { selectedIds },
    actions: { toggleSelected }
  } = useModeration();
  return (
    <Checkbox
      checked={selectedIds.has(item.id)}
      onCheckedChange={() => toggleSelected(item.id)}
      aria-label={`Select ${item.title}`}
      className={cn('border-muted-foreground/50 bg-background/60', className)}
    />
  );
}

function cardTone(item: ModeratedItem, isSelected: boolean) {
  return cn(
    'group relative overflow-hidden rounded-xl border bg-white/[0.03] transition-colors',
    item.status === 'reported' && 'border-amber-400/50',
    item.status === 'banned' && 'border-red-500/40',
    item.status === 'active' && 'border-white/10 hover:border-[var(--agora-accent)]/50',
    isSelected && 'ring-2 ring-[var(--agora-accent)]'
  );
}

export function AgoraItemCard({
  item,
  coverClassName = 'h-24'
}: {
  item: ModeratedItem;
  coverClassName?: string;
}) {
  const {
    state: { selectedIds }
  } = useModeration();
  const isBanned = item.status === 'banned';
  return (
    <article className={cardTone(item, selectedIds.has(item.id))}>
      <div className='relative'>
        <AgoraCover
          item={item}
          className={cn(coverClassName, isBanned && 'opacity-40 grayscale')}
        />
        {isBanned && (
          <span className='absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-600/85 py-1 text-center text-[0.7rem] font-semibold tracking-wide text-white uppercase'>
            Banned · {item.ban ? reasonLabel(item.ban.reason) : 'Removed'}
          </span>
        )}
        <span className='absolute top-2 left-2 flex rounded-md bg-[#07111d]/70 p-1 backdrop-blur'>
          <ItemSelect item={item} />
        </span>
        <ItemActionsMenu item={item} className='absolute top-2 right-2' />
      </div>
      <div className={cn('space-y-1.5 p-3', isBanned && 'opacity-60')}>
        <div className='flex items-start justify-between gap-2'>
          <h4 className='line-clamp-2 text-sm leading-snug font-medium'>{item.title}</h4>
          <StatusBadge item={item} />
        </div>
        <p className='line-clamp-1 text-xs text-white/60'>{item.subtitle}</p>
        <OwnerChip item={item} className='text-xs text-white/80' />
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.7rem] text-white/45'>
          <UploadedLabel item={item} />
          <span>·</span>
          <VisibilityLabel item={item} />
          {item.badge && (
            <>
              <span>·</span>
              <span>{item.badge}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
