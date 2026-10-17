'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { TOOLBAR_BUTTON_CLASS_NAME } from '@/components/whiteboard';
import { cn } from '@/lib/utils';
import { createLayer } from '../api/service';
import { SCREEN_SIZES, type DesignSection, type ScreenDevice } from '../api/types';
import { updateSectionCache } from '../lib/design-cache';
import type { Viewport } from '../store/camera-store';

const DEVICE_LABELS: Record<ScreenDevice, string> = { phone: 'Phone', desktop: 'Desktop' };

interface MockupToolOptions {
  section: DesignSection;
  /** The board element; clicks on its canvas drop the mockup while placing. */
  boardRef: RefObject<HTMLElement | null>;
  viewport: Viewport;
  onCreated: (layerId: string) => void;
}

/** `point` is in board pixels; the screen is centred on it. */
async function placeMockup(
  device: ScreenDevice,
  point: { x: number; y: number },
  { section, viewport, onCreated }: Omit<MockupToolOptions, 'boardRef'>
) {
  const size = SCREEN_SIZES[device];
  const count = section.layers.filter((layer) => layer.screen?.device === device).length;
  try {
    const layer = await createLayer({
      sectionId: section.id,
      title: `${DEVICE_LABELS[device]} screen ${count + 1}`,
      screen: {
        device,
        pageStyle: 'screen',
        x: Math.round((point.x - viewport.x) / viewport.zoom - size.width / 2),
        y: Math.round((point.y - viewport.y) / viewport.zoom - size.height / 2),
        nodes: []
      }
    });
    updateSectionCache(section.id, (cached) => ({ ...cached, layers: [...cached.layers, layer] }));
    onCreated(layer.id);
  } catch {
    toast.error("Couldn't add the screen");
  }
}

/**
 * Picks a device from the board toolbar, then follows the pointer with the screen's outline until
 * a click on the canvas drops it there as a new layer. Esc or a right click cancels.
 */
export function useMockupTool({ section, boardRef, viewport, onCreated }: MockupToolOptions) {
  const [placing, setPlacing] = useState<ScreenDevice | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const latest = useRef({ section, viewport, onCreated });
  useEffect(() => {
    latest.current = { section, viewport, onCreated };
  });

  useEffect(() => {
    const board = boardRef.current;
    if (!board || !placing) return;
    const device = placing;

    function local(event: PointerEvent) {
      const rect = board!.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function cancel() {
      setPlacing(null);
      setPointer(null);
    }

    // Only the canvas is taken over; the toolbar and menus keep working.
    function handlePointerMove(event: PointerEvent) {
      if (!(event.target instanceof HTMLCanvasElement)) {
        setPointer(null);
        return;
      }
      event.stopPropagation();
      setPointer(local(event));
    }

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof HTMLCanvasElement)) return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
      if (event.button === 0) void placeMockup(device, local(event), latest.current);
    }

    function handleContextMenu(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
    }

    function handlePointerLeave() {
      setPointer(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }

    const capture = { capture: true };
    board.addEventListener('pointermove', handlePointerMove, capture);
    board.addEventListener('pointerdown', handlePointerDown, capture);
    board.addEventListener('contextmenu', handleContextMenu, capture);
    board.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('keydown', handleKeyDown, capture);
    return () => {
      board.removeEventListener('pointermove', handlePointerMove, capture);
      board.removeEventListener('pointerdown', handlePointerDown, capture);
      board.removeEventListener('contextmenu', handleContextMenu, capture);
      board.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('keydown', handleKeyDown, capture);
    };
  }, [boardRef, placing]);

  const toolbarItem = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type='button'
            title='Screen mockup'
            aria-label='Screen mockup'
            aria-pressed={placing !== null}
            className={cn(TOOLBAR_BUTTON_CLASS_NAME, placing && 'is-active')}
          />
        }
      >
        <div className='ToolIcon__icon' aria-hidden='true'>
          <Icons.deviceMobile stroke={1.75} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='center' side='bottom' className='w-auto min-w-44'>
        {(['phone', 'desktop'] as const).map((device) => {
          const DeviceIcon = device === 'phone' ? Icons.deviceMobile : Icons.deviceDesktop;
          return (
            <DropdownMenuItem key={device} onClick={() => setPlacing(device)}>
              <DeviceIcon className='size-4' />
              {DEVICE_LABELS[device]} screen
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const size = placing ? SCREEN_SIZES[placing] : null;
  const ghost =
    placing && size && pointer ? (
      <div
        className='pointer-events-none absolute z-20'
        style={{ left: pointer.x, top: pointer.y }}
      >
        <div
          className='border-primary bg-primary/5 absolute -translate-1/2 rounded-md border-2 border-dashed'
          style={{ width: size.width * viewport.zoom, height: size.height * viewport.zoom }}
        />
        <span className='bg-popover text-popover-foreground absolute top-4 left-1/2 -translate-x-1/2 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap shadow'>
          Click to place · Esc to cancel
        </span>
      </div>
    ) : null;

  return { placing: placing !== null, toolbarItem, ghost };
}
