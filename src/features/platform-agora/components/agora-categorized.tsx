'use client';

import { useRef } from 'react';
import { Icons } from '@/components/icons';
import type { ModeratedItem } from '../data/moderation';
import { AgoraItemCard } from './agora-item-card';

const COLUMN_WIDTH = 288 + 16;

export interface ModeratedCategory {
  id: string;
  title: string;
  items: ModeratedItem[];
}

export function AgoraCategorized({ categories }: { categories: ModeratedCategory[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollColumns(direction: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: direction * COLUMN_WIDTH, behavior: 'smooth' });
  }

  return (
    <div>
      <div className='flex items-center justify-between px-4 pb-3 md:px-6'>
        <span className='text-xs text-white/40'>
          {categories.length} {categories.length === 1 ? 'category' : 'categories'}
        </span>
        <div className='flex gap-1'>
          <ArrowButton side='left' onClick={() => scrollColumns(-1)} />
          <ArrowButton side='right' onClick={() => scrollColumns(1)} />
        </div>
      </div>
      <div
        ref={scrollerRef}
        className='flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-6 [scrollbar-width:none] md:scroll-px-6 md:px-6'
      >
        {categories.map((category) => (
          <section key={category.id} className='flex w-72 shrink-0 snap-start flex-col gap-3'>
            <div className='flex items-baseline justify-between border-b border-white/10 pb-2'>
              <h3 className='text-sm font-semibold tracking-wide uppercase'>{category.title}</h3>
              <span className='text-xs text-white/40 tabular-nums'>{category.items.length}</span>
            </div>
            {category.items.map((item) => (
              <AgoraItemCard key={item.id} item={item} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function ArrowButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? Icons.chevronLeft : Icons.chevronRight;
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous columns' : 'Next columns'}
      className='flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:text-white'
    >
      <Icon className='size-4' />
    </button>
  );
}
