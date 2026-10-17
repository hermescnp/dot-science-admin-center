'use client';

import { useStore } from '@xyflow/react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useCanvasZoom } from './canvas-navigation';

const buttonClass =
  'text-muted-foreground hover:bg-accent/50 hover:text-foreground flex h-full items-center justify-center transition-colors';

/** React Flow zoom controls matching the free-design (Excalidraw) zoom pill. */
export function ZoomPill({ className }: { className?: string }) {
  const { zoomIn, zoomOut, resetZoom } = useCanvasZoom();
  const zoom = useStore((state) => state.transform[2]);

  return (
    <div
      className={cn(
        'bg-background/70 flex h-7.5 overflow-hidden rounded-[0.625rem] shadow-[0_0_0_1px_color-mix(in_oklab,var(--border)_70%,transparent)] backdrop-blur-sm',
        className
      )}
    >
      <button
        type='button'
        title='Zoom out — ⌘−'
        aria-label='Zoom out'
        className={cn(buttonClass, 'w-7.5')}
        onClick={zoomOut}
      >
        <Icons.minus className='size-3.5' />
      </button>
      <button
        type='button'
        title='Reset zoom — ⌘0'
        aria-label='Reset zoom'
        className={cn(buttonClass, 'w-12 text-xs tabular-nums')}
        onClick={resetZoom}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type='button'
        title='Zoom in — ⌘+'
        aria-label='Zoom in'
        className={cn(buttonClass, 'w-7.5')}
        onClick={zoomIn}
      >
        <Icons.add className='size-3.5' />
      </button>
    </div>
  );
}
