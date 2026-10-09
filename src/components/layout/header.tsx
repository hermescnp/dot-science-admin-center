import React from 'react';
import { Breadcrumbs } from '../breadcrumbs';
import SearchInput from '../search-input';
import CtaGithub from './cta-github';
import { SidebarOpenButton } from './sidebar-panel-toggle';
import { UserNav } from './user-nav';
import { NotificationCenter } from '@/features/notifications/components/notification-center';

export default function Header() {
  return (
    <header
      data-slot='app-header'
      className='bg-background/60 sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 backdrop-blur-md md:h-14'
    >
      <div className='flex min-w-0 flex-1 items-center gap-3 px-4'>
        <SidebarOpenButton />
        <Breadcrumbs />
      </div>

      <div data-slot='header-actions' className='flex items-center gap-2 px-4'>
        <CtaGithub />
        <SearchInput />
        <NotificationCenter />
        <UserNav />
      </div>
    </header>
  );
}
