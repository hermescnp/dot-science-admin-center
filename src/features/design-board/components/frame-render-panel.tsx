'use client';

import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { renderFrame } from '../api/service';
import {
  captureFrame,
  fitRenderToFrame,
  lastAiRender,
  type FittedRender
} from '../lib/frame-capture';

/** A frame's box in board pixels. */
interface FrameBox {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PanelView {
  /** The single selected frame, while it isn't being moved, resized or drawn. */
  selected: (FrameBox & { lastPrompt: string }) | null;
  /** Frames with a render in flight. */
  rendering: FrameBox[];
}

const EMPTY_VIEW: PanelView = { selected: null, rendering: [] };

function sameBox(a: FrameBox, b: FrameBox) {
  return (
    a.id === b.id &&
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height
  );
}

function sameView(a: PanelView, b: PanelView) {
  const selected =
    a.selected === b.selected ||
    (a.selected !== null &&
      b.selected !== null &&
      sameBox(a.selected, b.selected) &&
      a.selected.lastPrompt === b.selected.lastPrompt);
  return (
    selected &&
    a.rendering.length === b.rendering.length &&
    a.rendering.every((box, index) => sameBox(box, b.rendering[index]))
  );
}

function frameBox(frame: ExcalidrawElement, { scrollX, scrollY, zoom }: AppState): FrameBox {
  return {
    id: frame.id,
    left: (frame.x + scrollX) * zoom.value,
    top: (frame.y + scrollY) * zoom.value,
    width: frame.width * zoom.value,
    height: frame.height * zoom.value
  };
}

function isBusy(state: AppState) {
  return Boolean(
    state.selectedElementsAreBeingDragged ||
    state.resizingElement ||
    state.newElement ||
    state.editingFrame ||
    state.isRotating
  );
}

function findFrame(api: ExcalidrawImperativeAPI, id: string) {
  const element = api.getSceneElements().find((candidate) => candidate.id === id);
  return element?.type === 'frame' ? element : null;
}

interface FrameRenderPanelProps {
  api: ExcalidrawImperativeAPI | null;
  /** The mockup screens' layer, captured along with the board. */
  screensRef: RefObject<HTMLElement | null>;
  /** The UI structure of these layers' mockup screens, sent along with the screenshot. */
  describeScreens: (layerIds: string[]) => string;
  onRendered: (frameId: string, render: FittedRender, prompt: string) => void;
}

/**
 * Under the selected frame: a prompt that renders everything inside the frame (board elements and
 * the mockup screens under it) into a finished image. Each frame in flight gets a pulsing overlay.
 */
export function FrameRenderPanel({
  api,
  screensRef,
  describeScreens,
  onRendered
}: FrameRenderPanelProps) {
  const [view, setView] = useState<PanelView>(EMPTY_VIEW);
  const [renderingIds, setRenderingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const onRenderedRef = useRef(onRendered);

  useEffect(() => {
    onRenderedRef.current = onRendered;
  }, [onRendered]);

  useEffect(() => {
    if (!api) return;
    const board = api;
    function update() {
      const state = board.getAppState();
      const elements = board.getSceneElements();
      const selectedIds = Object.keys(state.selectedElementIds);
      const frame =
        selectedIds.length === 1 && !isBusy(state) ? findFrame(board, selectedIds[0]) : null;
      const next: PanelView = {
        selected: frame
          ? {
              ...frameBox(frame, state),
              lastPrompt: lastAiRender(elements, frame.id)?.prompt ?? ''
            }
          : null,
        rendering: elements
          .filter((element) => element.type === 'frame' && renderingIds.has(element.id))
          .map((element) => frameBox(element, state))
      };
      setView((previous) => (sameView(previous, next) ? previous : next));
    }
    update();
    return board.onChange(update);
  }, [api, renderingIds]);

  function setRendering(id: string, rendering: boolean) {
    setRenderingIds((previous) => {
      const next = new Set(previous);
      if (rendering) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function render(frameId: string, prompt: string) {
    const frame = api ? findFrame(api, frameId) : null;
    if (!api || !frame) return;
    setRendering(frameId, true);
    try {
      const { image, screenLayerIds, layout } = await captureFrame({
        api,
        frame,
        screensRoot: screensRef.current
      });
      const screens = screenLayerIds.length ? describeScreens(screenLayerIds) : '';
      const { dataUrl } = await renderFrame({
        prompt,
        screens: screens || undefined,
        layout: layout || undefined,
        image,
        width: frame.width,
        height: frame.height
      });
      const current = findFrame(api, frameId) ?? frame;
      onRenderedRef.current(frameId, await fitRenderToFrame(dataUrl, current), prompt);
    } catch (error) {
      toast.error("Couldn't render the frame", {
        description: error instanceof Error ? error.message : undefined
      });
    } finally {
      setRendering(frameId, false);
    }
  }

  const selected = view.selected && !renderingIds.has(view.selected.id) ? view.selected : null;
  const prompt = selected ? (drafts[selected.id] ?? selected.lastPrompt) : '';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (selected) void render(selected.id, prompt.trim());
  }

  return (
    <>
      {view.rendering.map((box) => (
        <div
          key={box.id}
          aria-live='polite'
          className='pointer-events-none absolute z-20 flex items-center justify-center overflow-hidden'
          style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
        >
          <div className='absolute inset-0 animate-pulse bg-[color-mix(in_oklch,var(--wb-ai)_16%,transparent)]' />
          <span className='bg-background/90 relative flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-(--wb-ai) shadow-sm'>
            <Icons.sparkles className='size-3.5' />
            Rendering…
          </span>
        </div>
      ))}
      {selected ? (
        <form
          onSubmit={handleSubmit}
          onKeyDown={(event) => event.nativeEvent.stopPropagation()}
          className='bg-popover text-popover-foreground absolute z-20 w-80 -translate-x-1/2 rounded-xl border p-1.5 shadow-lg'
          style={{
            left: selected.left + selected.width / 2,
            top: selected.top + selected.height + 12
          }}
        >
          <Textarea
            aria-label='Render prompt'
            placeholder='Describe the render…'
            value={prompt}
            maxLength={2000}
            onChange={(event) =>
              setDrafts((previous) => ({ ...previous, [selected.id]: event.target.value }))
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                handleSubmit(event);
              }
            }}
            className='max-h-40 min-h-14 resize-none border-0 bg-transparent px-1.5 py-1 shadow-none focus-visible:ring-0 dark:bg-transparent'
          />
          <div className='flex items-center justify-between gap-2 pt-1 pl-1.5'>
            <span className='text-muted-foreground text-xs'>Renders what is inside the frame</span>
            <Button
              type='submit'
              size='sm'
              className={cn(
                'text-(--wb-ai)',
                'bg-[color-mix(in_oklch,var(--wb-ai)_14%,transparent)]',
                'hover:bg-[color-mix(in_oklch,var(--wb-ai)_22%,transparent)]'
              )}
            >
              <Icons.sparkles />
              AI render
            </Button>
          </div>
        </form>
      ) : null}
    </>
  );
}
