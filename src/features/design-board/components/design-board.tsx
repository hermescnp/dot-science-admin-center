'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { Icons } from '@/components/icons';
import { Whiteboard, type WhiteboardScene } from '@/components/whiteboard';
import { getQueryClient } from '@/lib/query-client';
import { designBoardKeys, designBoardQueryOptions } from '../api/queries';
import { saveDesignBoard } from '../api/service';
import type { DesignBoard, DesignBoardScene } from '../api/types';

const SAVE_DELAY_MS = 1200;

type SaveState =
  | { status: 'saved'; at: string }
  | { status: 'pending' }
  | { status: 'saving' }
  | { status: 'error'; message: string };

function toStored(scene: WhiteboardScene): DesignBoardScene {
  return {
    elements: scene.elements.filter((element) => !element.isDeleted) as unknown[],
    files: scene.files as Record<string, unknown>,
    appState: scene.appState ?? {}
  };
}

export function DesignBoardView() {
  const { data: board } = useSuspenseQuery(designBoardQueryOptions());
  const { resolvedTheme } = useTheme();
  const [saveState, setSaveState] = useState<SaveState>({ status: 'saved', at: board.updatedAt });
  const pendingRef = useRef<DesignBoardScene | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function flush() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const scene = pendingRef.current;
    if (!scene) return;
    pendingRef.current = null;

    setSaveState({ status: 'saving' });
    try {
      const { updatedAt } = await saveDesignBoard(scene);
      getQueryClient().setQueryData<DesignBoard>(designBoardKeys.main(), (prev) =>
        prev ? { ...prev, scene, updatedAt } : prev
      );
      setSaveState(pendingRef.current ? { status: 'pending' } : { status: 'saved', at: updatedAt });
    } catch (error) {
      setSaveState({ status: 'error', message: (error as Error).message });
    }
  }

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });

  useEffect(() => () => void flushRef.current(), []);

  function handleSceneChange(scene: WhiteboardScene) {
    pendingRef.current = toStored(scene);
    setSaveState({ status: 'pending' });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flushRef.current(), SAVE_DELAY_MS);
  }

  return (
    <div className='relative h-[calc(100svh-4rem)] w-full overflow-hidden md:h-[calc(100svh-3.5rem)]'>
      <Whiteboard
        initialScene={board.scene as unknown as WhiteboardScene}
        onSceneChange={handleSceneChange}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      />
      <div className='bg-card/85 text-muted-foreground pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1 text-xs backdrop-blur'>
        <SaveIndicator state={saveState} />
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  switch (state.status) {
    case 'pending':
      return <span>Unsaved changes</span>;
    case 'saving':
      return (
        <>
          <Icons.spinner className='size-3.5 animate-spin' />
          <span>Saving…</span>
        </>
      );
    case 'error':
      return (
        <span className='text-destructive flex items-center gap-1.5'>
          <Icons.warning className='size-3.5' />
          Couldn&apos;t save: {state.message}
        </span>
      );
    case 'saved':
      return (
        <>
          <Icons.check className='size-3.5' />
          <span>
            {state.at
              ? `Saved ${formatDistanceToNow(new Date(state.at), { addSuffix: true })}`
              : 'Saved'}
          </span>
        </>
      );
  }
}
