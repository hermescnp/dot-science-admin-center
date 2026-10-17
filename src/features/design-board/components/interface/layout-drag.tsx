'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type {
  LayoutAlign,
  LayoutAnchor,
  LayoutDirection,
  LayoutWidth,
  UiNode
} from '../../api/types';
import { containsInstance, isInsideInstance, isInstance } from '../../lib/components';
import { defaultSelfAlign, type Flow } from '../../lib/layout-flow';
import { findNode, findParentId, layoutWidth } from '../../lib/node-tree';
import {
  dropParentLabel,
  dropTargetAt,
  flowItemsOf,
  nearestSlot,
  Pill,
  readFlow,
  toRect,
  type DropTarget,
  type FlowItem,
  type Rect
} from './flow-drop';
import { useWireframe } from './wireframe-context';

type Zone =
  | { kind: 'align'; band: number }
  | { kind: 'reorder'; index: number; line: Rect }
  | { kind: 'anchor'; anchor: LayoutAnchor }
  | { kind: 'unpin' }
  | { kind: 'transfer'; target: DropTarget; label: string };

interface Measured {
  boxElement: HTMLElement;
  placed: HTMLElement;
  box: Rect;
  flow: Flow;
  self: Rect;
  items: FlowItem[];
  parentId: string | null;
  /** The parent's children without the dragged node, which `moveNode` indexes into. */
  siblingIds: string[];
}

interface DragView {
  box: Rect;
  flow: Flow;
  pinning: boolean;
  zone: Zone | null;
}

const ANCHOR_GRID: LayoutAnchor[] = [
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right'
];

const ALIGN_BANDS: LayoutAlign[] = ['start', 'center', 'end'];

const BAND_LABELS: Record<LayoutDirection, string[]> = {
  column: ['Left', 'Center', 'Right'],
  row: ['Top', 'Middle', 'Bottom']
};

const DRAG_THRESHOLD = 4;
/** How far past its own row the pointer can go before a drag turns into a reorder. */
const SELF_SLACK = 6;

const clampBand = (fraction: number) => Math.min(2, Math.max(0, Math.floor(fraction * 3)));

/** Reads the flow box an element sits in back from the rendered layout. */
function measure(shell: HTMLElement, node: UiNode, nodes: UiNode[]): Measured | null {
  const placed = shell.closest<HTMLElement>('[data-place-first]');
  const box = placed?.parentElement;
  if (!placed || !box?.dataset.flowDirection) return null;
  const parentId = findParentId(nodes, node.id);
  if (parentId === undefined) return null;
  const siblings = parentId === null ? nodes : (findNode(nodes, parentId)?.children ?? []);

  return {
    boxElement: box,
    placed,
    box: toRect(box.getBoundingClientRect()),
    flow: readFlow(box),
    self: toRect(placed.getBoundingClientRect()),
    items: flowItemsOf(box, (element) => element === placed),
    parentId,
    siblingIds: siblings.flatMap((sibling) => (sibling.id === node.id ? [] : [sibling.id]))
  };
}

/** The insertion point nearest the pointer along the flow, skipping the node's own slots. */
function reorderZone(measured: Measured, main: number): Zone | null {
  const { box, flow, items, siblingIds } = measured;
  const slot = nearestSlot(box, flow, items, siblingIds, main);
  return slot ? { kind: 'reorder', ...slot } : null;
}

/** Components can't nest, so an element carrying an instance can't go inside one. */
function canHold(nodes: UiNode[], node: UiNode, parentId: string | null) {
  if (parentId === null || !(isInstance(node) || containsInstance(node))) return true;
  const parent = findNode(nodes, parentId);
  return !!parent && !isInstance(parent) && !isInsideInstance(nodes, parentId);
}

/**
 * A move into another flow box: the container (or gap) under the pointer, looking past the dragged
 * element itself. Null over the element's own box, where aligning and reordering apply.
 */
function transferZone(
  measured: Measured,
  node: UiNode,
  nodes: UiNode[],
  x: number,
  y: number
): Zone | null {
  const hit = document
    .elementsFromPoint(x, y)
    .find((element) => !measured.placed.contains(element));
  if (!hit) return null;
  const target = dropTargetAt(hit, x, y, nodes, node.id);
  if (!target || (target.kind === 'slot' && target.element === measured.boxElement)) return null;
  // The other screens' sketches carry the same markers but hold other nodes.
  const screen = measured.placed.closest('.react-flow__node');
  if (screen && !screen.contains(target.element)) return null;
  if (!canHold(nodes, node, target.parentId)) return null;
  return {
    kind: 'transfer',
    target,
    label: `Move into ${dropParentLabel(nodes, target.parentId)}`
  };
}

function zoneAt(measured: Measured, x: number, y: number, pinning: boolean, anchored: boolean) {
  const { box, flow, self } = measured;
  const fx = (x - box.left) / box.width;
  const fy = (y - box.top) / box.height;
  const inside = fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1;

  if (pinning) {
    if (!inside) return anchored ? ({ kind: 'unpin' } as const) : null;
    return { kind: 'anchor', anchor: ANCHOR_GRID[clampBand(fy) * 3 + clampBand(fx)] } as const;
  }
  if (!inside) return null;

  const column = flow.direction === 'column';
  const main = column ? y : x;
  const selfStart = column ? self.top : self.left;
  const selfEnd = selfStart + (column ? self.height : self.width);
  if (main >= selfStart - SELF_SLACK && main <= selfEnd + SELF_SLACK) {
    return { kind: 'align', band: clampBand(column ? fx : fy) } as const;
  }
  return reorderZone(measured, main);
}

function zoneLabel(zone: Zone, flow: Flow) {
  switch (zone.kind) {
    case 'align':
      return BAND_LABELS[flow.direction][zone.band];
    case 'reorder':
      return 'Move here';
    case 'anchor':
      return `Pin ${zone.anchor.replace('-', ' ')}`;
    case 'unpin':
      return 'Unpin';
    case 'transfer':
      return zone.label;
  }
}

/** Guides drawn over the parent container (or the one it moves into) while an element is dragged. */
function LayoutDragOverlay({ view }: { view: DragView }) {
  const { box, flow, pinning, zone } = view;
  const column = flow.direction === 'column';
  const line =
    zone?.kind === 'reorder'
      ? zone.line
      : zone?.kind === 'transfer' && zone.target.kind === 'slot'
        ? zone.target.line
        : null;
  return createPortal(
    <div
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      className='pointer-events-none fixed z-[1000]'
    >
      <div
        className={cn(
          'absolute inset-0 rounded-md border border-dashed',
          zone?.kind === 'unpin' ? 'border-destructive' : 'border-primary/70'
        )}
      />
      {zone?.kind === 'transfer' ? null : pinning ? (
        <div className='absolute inset-0 grid grid-cols-3 grid-rows-3'>
          {ANCHOR_GRID.map((anchor) => (
            <div
              key={anchor}
              className={cn(
                'border-primary/20 border border-dashed',
                zone?.kind === 'anchor' &&
                  zone.anchor === anchor &&
                  'bg-primary/15 border-primary/60'
              )}
            />
          ))}
        </div>
      ) : (
        <div className={cn('absolute inset-0 flex', column ? 'flex-row' : 'flex-col')}>
          {ALIGN_BANDS.map((align, band) => (
            <div
              key={align}
              className={cn(
                'border-primary/25 flex-1 border-dashed',
                band > 0 && (column ? 'border-l' : 'border-t'),
                zone?.kind === 'align' && zone.band === band && 'bg-primary/10'
              )}
            />
          ))}
        </div>
      )}
      {line ? <div style={line} className='bg-primary absolute rounded-full' /> : null}
      {zone ? (
        <div className='absolute inset-x-0 -top-6 flex justify-center'>
          <Pill>{zoneLabel(zone, flow)}</Pill>
        </div>
      ) : null}
    </div>,
    document.body
  );
}

/** A drag ends with a click on whatever is under the pointer; that click must not reselect. */
function swallowNextClick() {
  const stop = (event: MouseEvent) => event.stopPropagation();
  window.addEventListener('click', stop, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0);
}

/**
 * Dragging the selected element inside its container: sideways (along its own row) aligns it,
 * along the flow reorders it, and with Alt held (or when already pinned) it pins to a 3×3 anchor.
 */
export function useLayoutDrag(node: UiNode) {
  const { editable, selectedId, nodes, updateLayout, moveNode } = useWireframe();
  const [view, setView] = useState<DragView | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  if (!editable || selectedId !== node.id) return { dragProps: {}, dragging: false, overlay: null };

  const layout = node.properties?.layout;
  const anchored = Boolean(layout?.anchor);

  function apply(zone: Zone, measured: Measured) {
    switch (zone.kind) {
      case 'align': {
        const align = ALIGN_BANDS[zone.band];
        const alignSelf = align === defaultSelfAlign(measured.flow) ? undefined : align;
        if (alignSelf !== layout?.alignSelf) updateLayout(node.id, { alignSelf });
        return;
      }
      case 'reorder':
        moveNode(node.id, measured.parentId, zone.index);
        return;
      case 'anchor':
        if (zone.anchor !== layout?.anchor) updateLayout(node.id, { anchor: zone.anchor });
        return;
      case 'unpin':
        updateLayout(node.id, { anchor: undefined });
        return;
      case 'transfer': {
        const { target } = zone;
        moveNode(node.id, target.parentId, target.kind === 'slot' ? target.index : Infinity);
      }
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const shell = event.currentTarget;
    if ((event.target as HTMLElement).closest('[data-node-id]') !== shell) return;
    const measured = measure(shell, node, nodes);
    if (!measured) return;

    const { pointerId, clientX: startX, clientY: startY } = event;
    let started = false;
    let last = { x: startX, y: startY };
    let zone: Zone | null = null;

    const update = (pinKey: boolean) => {
      const pinning = pinKey || anchored;
      const transfer = pinning ? null : transferZone(measured, node, nodes, last.x, last.y);
      zone = transfer ?? zoneAt(measured, last.x, last.y, pinning, anchored);
      if (transfer?.kind === 'transfer') {
        const { target } = transfer;
        const flow = target.kind === 'slot' ? target.flow : measured.flow;
        setView({ box: target.box, flow, pinning, zone });
      } else {
        setView({ box: measured.box, flow: measured.flow, pinning, zone });
      }
    };
    const onMove = (move: PointerEvent) => {
      if (move.pointerId !== pointerId) return;
      if (!started && Math.hypot(move.clientX - startX, move.clientY - startY) < DRAG_THRESHOLD) {
        return;
      }
      started = true;
      last = { x: move.clientX, y: move.clientY };
      update(move.altKey);
    };
    const onKey = (key: KeyboardEvent) => {
      if (!started) return;
      if (key.key === 'Escape') finish(false);
      else if (key.key === 'Alt') update(key.type === 'keydown');
    };
    const onUp = (up: PointerEvent) => {
      if (up.pointerId === pointerId) finish(true);
    };
    const onCancel = () => finish(false);

    const remove = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      cleanup.current = null;
    };
    function finish(commit: boolean) {
      remove();
      setView(null);
      if (!started) return;
      swallowNextClick();
      if (commit && zone) apply(zone, measured!);
    }

    cleanup.current?.();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    cleanup.current = remove;
  }

  return {
    dragProps: { onPointerDown },
    dragging: view !== null,
    overlay: view ? <LayoutDragOverlay view={view} /> : null
  };
}

const WIDTH_STEPS = [25, 33, 50, 66, 75];

function snapWidth(percent: number): LayoutWidth {
  if (percent >= 90) return 'fill';
  if (percent < 20) return 'hug';
  return WIDTH_STEPS.reduce((best, step) =>
    Math.abs(step - percent) < Math.abs(best - percent) ? step : best
  );
}

const widthLabel = (width: LayoutWidth) =>
  width === 'fill' ? 'Fill' : width === 'hug' ? 'Hug' : `${width}%`;

interface WidthPreview {
  rect: Rect;
  width: LayoutWidth;
}

/** A grip on the selected element's right edge; dragging it sets the width within its parent. */
export function WidthHandle({ node }: { node: UiNode }) {
  const { editable, selectedId, updateLayout } = useWireframe();
  const [preview, setPreview] = useState<WidthPreview | null>(null);
  const drag = useRef<{ id: number; placed: Rect; box: Rect } | null>(null);
  if (!editable || selectedId !== node.id) return null;

  const previewAt = (x: number): WidthPreview => {
    const { placed, box } = drag.current!;
    const raw = Math.max(0, x - placed.left);
    const width = snapWidth((raw / box.width) * 100);
    const pixels =
      width === 'fill'
        ? box.left + box.width - placed.left
        : width === 'hug'
          ? raw
          : (width / 100) * box.width;
    return { rect: { ...placed, width: pixels }, width };
  };

  return (
    <>
      <span
        role='separator'
        aria-orientation='vertical'
        aria-label='Resize width'
        title='Drag to resize width'
        className='nodrag nopan bg-primary absolute top-1/2 -right-2 z-10 h-6 w-1.5 -translate-y-1/2 cursor-ew-resize touch-none rounded-full'
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.preventDefault();
          const placed = event.currentTarget.closest<HTMLElement>('[data-place-first]');
          const box = placed?.parentElement;
          if (!placed || !box) return;
          drag.current = {
            id: event.pointerId,
            placed: toRect(placed.getBoundingClientRect()),
            box: toRect(box.getBoundingClientRect())
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          setPreview(previewAt(event.clientX));
        }}
        onPointerMove={(event) => {
          if (drag.current?.id === event.pointerId) setPreview(previewAt(event.clientX));
        }}
        onPointerUp={(event) => {
          if (drag.current?.id !== event.pointerId) return;
          const { width } = previewAt(event.clientX);
          drag.current = null;
          setPreview(null);
          if (width !== layoutWidth(node)) updateLayout(node.id, { width });
        }}
        onPointerCancel={() => {
          drag.current = null;
          setPreview(null);
        }}
      />
      {preview
        ? createPortal(
            <div
              style={{ ...preview.rect }}
              className='border-primary bg-primary/10 pointer-events-none fixed z-[1000] rounded-md border-2 border-dashed'
            >
              <div className='absolute inset-x-0 -top-6 flex justify-center'>
                <Pill>{widthLabel(preview.width)}</Pill>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
