'use client';

import { useSyncExternalStore } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useComposerStore } from '../store';
import { PreviewPanel } from './previews/preview-panel';
import { PublicationBrief } from './publication-brief';

const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true
  );
}

export function SocialComposer() {
  const isDesktop = useIsDesktop();

  return (
    <div className='flex flex-col gap-3'>
      <ComposerToolbar />
      {isDesktop ? (
        <ResizablePanelGroup
          orientation='horizontal'
          className='h-[calc(100dvh-15rem)] min-h-[560px] rounded-xl border'
        >
          <ResizablePanel defaultSize='60' minSize='40'>
            <div className='h-full overflow-y-auto p-4'>
              <PublicationBrief />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize='40' minSize='28'>
            <div className='bg-muted/30 h-full overflow-y-auto'>
              <PreviewHeading />
              <PreviewPanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className='flex flex-col gap-4'>
          <PublicationBrief />
          <div className='bg-muted/30 rounded-xl border'>
            <PreviewHeading />
            <PreviewPanel />
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewHeading() {
  return (
    <div className='bg-muted/80 supports-backdrop-filter:backdrop-blur-sm sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-2.5'>
      <Icons.eye className='size-4' />
      <span className='text-sm font-medium'>Previews</span>
    </div>
  );
}

function ComposerToolbar() {
  const reset = useComposerStore((s) => s.reset);

  return (
    <div className='flex flex-wrap items-center justify-end gap-2'>
      <Button variant='outline' size='sm' onClick={reset}>
        <Icons.refresh className='size-4' />
        Reset
      </Button>
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <Button size='sm' disabled>
            <Icons.sparkles className='size-4' />
            Generate with AI
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Coming soon: drafts every platform&apos;s copy from the brief
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
