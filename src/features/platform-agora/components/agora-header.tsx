'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { HeaderPortal } from '@/components/layout/header-portal';
import { HEADER_CENTER_SLOT_ID } from '@/components/layout/header-slot';
import { cn } from '@/lib/utils';
import type { AgoraConfig } from '../data/agora-configs';

interface AgoraHeaderProps {
  config: AgoraConfig;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function AgoraHeader({ config, activeTab, onTabChange }: AgoraHeaderProps) {
  return (
    <header className='relative overflow-hidden px-4 pt-6 pb-5 md:px-6'>
      <div
        aria-hidden
        className='pointer-events-none absolute -top-16 left-1/2 size-72 -translate-x-1/2 rounded-full bg-[var(--agora-accent)]/20 blur-3xl'
      />
      <div className='relative flex items-center justify-center gap-3'>
        <Image
          src={config.logo}
          alt={config.name}
          width={56}
          height={56}
          className='size-12 object-contain md:size-14'
          unoptimized
        />
        <div className='text-left'>
          <h1 className='text-lg font-semibold tracking-wide md:text-xl'>
            {config.name} <span className='text-white/40'>·</span>{' '}
            <span className='text-[var(--agora-accent)]'>Agora moderation</span>
          </h1>
          <p className='text-sm text-white/50'>
            Review and moderate everything users upload to {config.name}
          </p>
        </div>
      </div>
      <HeaderPortal slotId={HEADER_CENTER_SLOT_ID}>
        <nav
          aria-label={`${config.name} sections`}
          style={{ '--agora-accent': config.accent } as CSSProperties}
          className='border-border bg-muted/40 flex max-w-full gap-1 overflow-x-auto rounded-full border p-1'
        >
          {config.tabs.map((tab) => (
            <button
              key={tab.id}
              type='button'
              onClick={() => onTabChange(tab.id)}
              aria-current={tab.id === activeTab ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1 text-sm transition-colors',
                tab.id === activeTab
                  ? 'bg-[var(--agora-accent)] font-medium text-[#07111d]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </HeaderPortal>
    </header>
  );
}
