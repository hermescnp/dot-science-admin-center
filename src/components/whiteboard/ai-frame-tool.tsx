'use client';

import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

import { cn } from '@/lib/utils';

import { TOOLBAR_BUTTON_CLASS_NAME } from './toolbar-button';
import { useActiveToolType } from './use-active-tool';

/** A frame mark spanning the whole box, like the neighbouring tool icons, with a sparkle in its middle. */
const AI_FRAME_ICON = (
  <svg
    aria-hidden='true'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={1.5}
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M2 6h20M2 18h20M6 2v20M18 2v20' />
    <path
      d='M12 7.5l1.4 3.1 3.1 1.4-3.1 1.4-1.4 3.1-1.4-3.1-3.1-1.4 3.1-1.4z'
      fill='currentColor'
      strokeWidth={1}
      style={{ color: 'var(--wb-ai)' }}
    />
  </svg>
);

/**
 * Excalidraw's frame tool, taken out of its "More tools" menu and marked with an AI sparkle:
 * frames are where AI generation happens.
 */
export function AiFrameTool({ api }: { api: ExcalidrawImperativeAPI | null }) {
  const active = useActiveToolType(api) === 'frame';
  return (
    <button
      type='button'
      title='AI Frame — F'
      aria-label='AI Frame'
      aria-pressed={active}
      onClick={() => api?.setActiveTool({ type: 'frame' })}
      className={cn(TOOLBAR_BUTTON_CLASS_NAME, 'App-toolbar__ai-frame')}
    >
      <div className='ToolIcon__icon' aria-hidden='true'>
        {AI_FRAME_ICON}
      </div>
    </button>
  );
}
