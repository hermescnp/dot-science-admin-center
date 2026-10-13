'use client';

import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { Suspense, type CSSProperties } from 'react';
import { HeaderPortal } from '@/components/layout/header-portal';
import { HEADER_CENTER_SLOT_ID } from '@/components/layout/header-slot';
import { Skeleton } from '@/components/ui/skeleton';
import { StarmapView } from '@/features/starmap/components/starmap-view';
import { cn } from '@/lib/utils';
import { KnowledgeBaseView } from './knowledge-base-view';

const TABS = [
  { id: 'graph', label: 'Knowledge Graph' },
  { id: 'base', label: 'Knowledge base' }
] as const;

const tabParser = parseAsStringLiteral(TABS.map((tab) => tab.id)).withDefault('graph');

const fullBleedSkeleton = (
  <Skeleton className='h-[calc(100svh-4rem)] w-full rounded-none md:h-[calc(100svh-3.5rem)]' />
);

export function KnowledgeManagementView() {
  const [tab, setTab] = useQueryState('tab', tabParser);

  return (
    <>
      <HeaderPortal slotId={HEADER_CENTER_SLOT_ID}>
        <nav
          aria-label='Knowledge management sections'
          style={{ '--agora-accent': '#68DBFF' } as CSSProperties}
          className='border-border bg-muted/40 flex max-w-full gap-1 overflow-x-auto rounded-full border p-1'
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type='button'
              onClick={() => void setTab(item.id === 'graph' ? null : item.id)}
              aria-current={item.id === tab ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1 text-sm transition-colors',
                item.id === tab
                  ? 'bg-[var(--agora-accent)] font-medium text-[#07111d]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </HeaderPortal>
      <Suspense fallback={fullBleedSkeleton}>
        {tab === 'graph' ? <StarmapView /> : <KnowledgeBaseView />}
      </Suspense>
    </>
  );
}
