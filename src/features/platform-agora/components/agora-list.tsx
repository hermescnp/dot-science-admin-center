'use client';

import { cn } from '@/lib/utils';
import { reportCount, type ModeratedItem } from '../data/moderation';
import {
  AgoraCover,
  ItemSelect,
  OwnerChip,
  StatusBadge,
  UploadedLabel,
  VisibilityLabel
} from './agora-item-card';
import { ItemActionsMenu } from './moderation-actions';
import { useModeration } from './moderation-context';

const COLUMNS =
  'grid grid-cols-[1.5rem_minmax(12rem,2fr)_minmax(9rem,1.2fr)_6rem_6rem_4.5rem_9rem_2rem] items-center gap-3';

export function AgoraList({ items }: { items: ModeratedItem[] }) {
  const {
    state: { selectedIds }
  } = useModeration();
  return (
    <div className='px-4 pb-8 md:px-6'>
      <div className='overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]'>
        <div className='min-w-[60rem]'>
          <div
            className={cn(
              COLUMNS,
              'border-b border-white/10 px-3 py-2 text-[0.7rem] font-medium tracking-wide text-white/45 uppercase'
            )}
          >
            <span />
            <span>Item</span>
            <span>Owner</span>
            <span>Uploaded</span>
            <span>Visibility</span>
            <span className='text-right'>Reports</span>
            <span>Status</span>
            <span />
          </div>
          <ul className='divide-y divide-white/5'>
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  COLUMNS,
                  'px-3 py-2 text-sm transition-colors hover:bg-white/[0.04]',
                  selectedIds.has(item.id) && 'bg-[var(--agora-accent)]/10',
                  item.status === 'banned' && 'text-white/50'
                )}
              >
                <ItemSelect item={item} />
                <span className='flex min-w-0 items-center gap-3'>
                  <AgoraCover
                    item={item}
                    className={cn(
                      'size-9 shrink-0 rounded-lg',
                      item.status === 'banned' && 'opacity-40 grayscale'
                    )}
                    initialClassName='-bottom-2 text-3xl'
                  />
                  <span className='min-w-0'>
                    <span className='block truncate font-medium'>{item.title}</span>
                    <span className='block truncate text-xs text-white/50'>
                      {item.categoryTitle} · {item.subtitle}
                    </span>
                  </span>
                </span>
                <span className='min-w-0'>
                  <OwnerChip item={item} className='text-xs' />
                  <span className='block truncate pl-6.5 text-[0.7rem] text-white/40'>
                    {item.owner.email}
                  </span>
                </span>
                <span className='text-xs text-white/60'>
                  <UploadedLabel item={item} />
                </span>
                <span className='text-xs text-white/60'>
                  <VisibilityLabel item={item} />
                </span>
                <span
                  className={cn(
                    'text-right text-xs tabular-nums',
                    reportCount(item) > 0 ? 'text-amber-300' : 'text-white/40'
                  )}
                >
                  {reportCount(item)}
                </span>
                <span>
                  <StatusBadge item={item} />
                </span>
                <ItemActionsMenu item={item} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
