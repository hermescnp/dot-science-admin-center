'use client';

import dynamic from 'next/dynamic';

export type {
  WhiteboardCamera,
  WhiteboardHistory,
  WhiteboardProps,
  WhiteboardScene
} from './whiteboard';
export { TOOLBAR_BUTTON_CLASS_NAME } from './toolbar-button';

/** Excalidraw touches `window` on import, so the board only ever renders on the client. */
export const Whiteboard = dynamic(() => import('./whiteboard').then((mod) => mod.Whiteboard), {
  ssr: false,
  loading: () => (
    <div className='text-muted-foreground flex h-full w-full items-center justify-center text-sm'>
      Loading board…
    </div>
  )
});
