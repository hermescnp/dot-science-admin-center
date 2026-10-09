'use client';

import { Icons } from '@/components/icons';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarPanelToggleProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}

export function SidebarPanelToggle({ label, onClick, children }: SidebarPanelToggleProps) {
  return (
    <div className='border-sidebar-border bg-background/90 inline-flex h-8 shrink-0 items-stretch overflow-hidden rounded-xl border shadow-2xl backdrop-blur-md'>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type='button'
              aria-label={label}
              className='text-muted-foreground/80 hover:bg-sidebar-accent hover:text-foreground/90 flex w-8 items-center justify-center transition-colors'
              onClick={onClick}
            />
          }
        >
          {children}
        </TooltipTrigger>
        <TooltipContent side='bottom'>{label}</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function SidebarOpenButton() {
  const { state, isMobile, openMobile, toggleSidebar } = useSidebar();
  const isPanelHidden = isMobile ? !openMobile : state === 'collapsed';

  if (!isPanelHidden) return null;

  return (
    <SidebarPanelToggle label='Expand sidebar' onClick={toggleSidebar}>
      <Icons.chevronsRight className='size-4' />
    </SidebarPanelToggle>
  );
}
