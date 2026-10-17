'use client';

import { useEffect, useState, type DragEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { DesignLayer, DesignSection, UiNode } from '../api/types';
import {
  DropIndicator,
  dropLabel,
  dropTargetAt,
  dropTargetKey,
  Pill,
  type DropTarget
} from './interface/flow-drop';
import { NODE_DRAG_MIME, ROOT_DROP_ID } from './interface/wireframe-context';

/** Where a component dragged over the board lands: in a screen, or on the board as an image. */
export type BoardDrop =
  | { kind: 'screen'; layer: DesignLayer; target: DropTarget }
  | { kind: 'board'; x: number; y: number };

function within(rect: DOMRect, x: number, y: number) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/** The screen under (`x`, `y`); the active one is drawn over the others, so it wins. */
export function screenAt(
  root: HTMLElement | null,
  x: number,
  y: number,
  activeLayerId: string | null
): string | null {
  const frames = root?.querySelectorAll<HTMLElement>('.react-flow__node') ?? [];
  const ids = [...frames]
    .filter((frame) => within(frame.getBoundingClientRect(), x, y))
    .map((frame) => frame.dataset.id);
  return ids.includes(activeLayerId ?? undefined) ? activeLayerId : (ids[0] ?? null);
}

/**
 * The insertion point in a sketched screen. The sketches sit under the board and never get
 * pointer events, so the innermost drop box around the point is found by its bounds. Outside the
 * screen's body (its title bar) the drop goes to the page.
 */
function screenTarget(frame: HTMLElement, nodes: UiNode[], x: number, y: number) {
  const body = frame.querySelector<HTMLElement>('[data-sketch-body]');
  let hit: HTMLElement | null = null;
  if (body && within(body.getBoundingClientRect(), x, y)) {
    for (const box of body.querySelectorAll<HTMLElement>(
      '[data-flow-parent], [data-drop-inside]'
    )) {
      if (within(box.getBoundingClientRect(), x, y)) hit = box;
    }
  }
  hit ??= frame.querySelector<HTMLElement>(`[data-flow-parent="${ROOT_DROP_ID}"]`);
  return hit ? dropTargetAt(hit, x, y, nodes) : null;
}

function dropKey(drop: BoardDrop | null) {
  if (!drop) return '';
  return drop.kind === 'screen'
    ? `${drop.layer.id}:${dropTargetKey(drop.target)}`
    : `board:${Math.round(drop.x)}:${Math.round(drop.y)}`;
}

interface BoardComponentDropOptions {
  section: DesignSection;
  activeLayerId: string | null;
  /** The element holding the sketched screens. */
  screensRef: RefObject<HTMLElement | null>;
  onDrop: (drop: BoardDrop, value: string) => void;
}

/**
 * Component cards dragged over the free design board: over a screen they insert at the gap
 * nearest the pointer, like in Edit layout; anywhere else they become an image on the board.
 * Handled in the capture phase so the board never treats them as its own drops.
 */
export function useBoardComponentDrop({
  section,
  activeLayerId,
  screensRef,
  onDrop
}: BoardComponentDropOptions) {
  const [current, setCurrent] = useState<BoardDrop | null>(null);
  const active = current !== null;

  useEffect(() => {
    if (!active) return;
    const clear = () => setCurrent(null);
    document.addEventListener('dragend', clear);
    document.addEventListener('drop', clear);
    return () => {
      document.removeEventListener('dragend', clear);
      document.removeEventListener('drop', clear);
    };
  }, [active]);

  function resolve(x: number, y: number): BoardDrop {
    const root = screensRef.current;
    const layerId = screenAt(root, x, y, activeLayerId);
    const layer = section.layers.find((candidate) => candidate.id === layerId);
    const frame = root?.querySelector<HTMLElement>(`.react-flow__node[data-id="${layerId}"]`);
    const target = layer?.screen && frame ? screenTarget(frame, layer.screen.nodes, x, y) : null;
    return layer && target ? { kind: 'screen', layer, target } : { kind: 'board', x, y };
  }

  function show(next: BoardDrop | null) {
    setCurrent((previous) => (dropKey(previous) === dropKey(next) ? previous : next));
  }

  const dropProps = {
    onDragOverCapture: (event: DragEvent) => {
      if (!event.dataTransfer.types.includes(NODE_DRAG_MIME)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
      show(resolve(event.clientX, event.clientY));
    },
    onDragLeave: (event: DragEvent) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
      show(null);
    },
    onDropCapture: (event: DragEvent) => {
      const value = event.dataTransfer.getData(NODE_DRAG_MIME);
      if (!value) return;
      event.preventDefault();
      event.stopPropagation();
      show(null);
      onDrop(resolve(event.clientX, event.clientY), value);
    }
  };

  const indicator = !current ? null : current.kind === 'screen' ? (
    <DropIndicator
      target={current.target}
      label={dropLabel(current.layer.screen?.nodes ?? [], current.target)}
    />
  ) : (
    createPortal(
      <div
        className='pointer-events-none fixed z-[1000] -translate-x-1/2'
        style={{ left: current.x, top: current.y + 18 }}
      >
        <Pill>Place as image</Pill>
      </div>,
      document.body
    )
  );

  return { dropProps, indicator };
}
