import { createPortal } from 'react-dom';
import type { LayoutAlign, LayoutDirection, UiNode } from '../../api/types';
import type { Flow } from '../../lib/layout-flow';
import { findNode } from '../../lib/node-tree';
import { ROOT_DROP_ID } from './wireframe-context';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const toRect = ({ left, top, width, height }: DOMRect): Rect => ({
  left,
  top,
  width,
  height
});

/** A flow item as rendered: one element, or a row of column layouts. */
export interface FlowItem {
  first: string;
  last: string;
  rect: Rect;
  /** The element being moved; the slots on either side of it would leave it in place. */
  self: boolean;
}

export function readFlow(box: HTMLElement): Flow {
  return {
    direction: (box.dataset.flowDirection ?? 'column') as LayoutDirection,
    align: (box.dataset.flowAlign ?? 'stretch') as LayoutAlign
  };
}

/** The in-flow items of a flow box; anchored elements float over it and take no slot. */
export function flowItemsOf(box: HTMLElement, isSelf: (element: HTMLElement) => boolean) {
  return Array.from(box.children).flatMap((element): FlowItem[] =>
    element instanceof HTMLElement &&
    element.dataset.placeFirst &&
    element.dataset.anchored === undefined
      ? [
          {
            first: element.dataset.placeFirst,
            last: element.dataset.placeLast ?? element.dataset.placeFirst,
            rect: toRect(element.getBoundingClientRect()),
            self: isSelf(element)
          }
        ]
      : []
  );
}

export interface Slot {
  /** Index into `siblingIds`, the parent's children without the moved element. */
  index: number;
  /** The insertion line, relative to the box. */
  line: Rect;
}

/** The insertion point nearest `main` (the pointer along the flow), skipping the moved element's own slots. */
export function nearestSlot(
  box: Rect,
  flow: Flow,
  items: FlowItem[],
  siblingIds: string[],
  main: number
): Slot | null {
  const column = flow.direction === 'column';
  const lineAt = (position: number): Rect =>
    column
      ? { left: 0, top: position - box.top - 1, width: box.width, height: 2 }
      : { left: position - box.left - 1, top: 0, width: 2, height: box.height };
  if (!items.length) {
    return { index: siblingIds.length, line: lineAt(column ? box.top + 1 : box.left + 1) };
  }

  const start = (rect: Rect) => (column ? rect.top : rect.left);
  const end = (rect: Rect) => (column ? rect.top + rect.height : rect.left + rect.width);
  let best: Slot | null = null;
  let bestDistance = Infinity;
  for (let slot = 0; slot <= items.length; slot++) {
    const before = items[slot - 1];
    const after = items[slot];
    if (before?.self || after?.self) continue;
    const position = !before
      ? start(after.rect)
      : !after
        ? end(before.rect)
        : (end(before.rect) + start(after.rect)) / 2;
    const index = after ? siblingIds.indexOf(after.first) : siblingIds.indexOf(before.last) + 1;
    const distance = Math.abs(main - position);
    if (index < 0 || distance >= bestDistance) continue;
    bestDistance = distance;
    best = { index, line: lineAt(position) };
  }
  return best;
}

export type DropTarget =
  | {
      kind: 'slot';
      parentId: string | null;
      index: number;
      element: HTMLElement;
      box: Rect;
      flow: Flow;
      line: Rect;
    }
  | { kind: 'inside'; parentId: string; element: HTMLElement; box: Rect };

/**
 * Where a drop at (`x`, `y`) on `element` lands: the nearest gap in the innermost flow box around
 * it, or inside the empty container it is over. `movingId` is an element being moved, which
 * doesn't count as a sibling.
 */
export function dropTargetAt(
  element: Element,
  x: number,
  y: number,
  nodes: UiNode[],
  movingId?: string
): DropTarget | null {
  const empty = element.closest<HTMLElement>('[data-drop-inside]');
  const box = element.closest<HTMLElement>('[data-flow-parent]');
  if (empty && (!box || box.contains(empty))) {
    const shell = empty.closest<HTMLElement>('[data-node-id]') ?? empty;
    return {
      kind: 'inside',
      parentId: empty.dataset.dropInside!,
      element: shell,
      box: toRect(shell.getBoundingClientRect())
    };
  }
  if (!box) return null;

  const raw = box.dataset.flowParent!;
  const parentId = raw === ROOT_DROP_ID ? null : raw;
  const siblings = parentId === null ? nodes : findNode(nodes, parentId)?.children;
  if (!siblings) return null;
  const siblingIds = siblings.flatMap((sibling) => (sibling.id === movingId ? [] : [sibling.id]));
  const flow = readFlow(box);
  const rect = toRect(box.getBoundingClientRect());
  const items = flowItemsOf(
    box,
    (item) => item.dataset.placeFirst === movingId && item.dataset.placeLast === movingId
  );
  const slot = nearestSlot(rect, flow, items, siblingIds, flow.direction === 'column' ? y : x);
  if (!slot) return null;
  return {
    kind: 'slot',
    parentId,
    index: slot.index,
    element: box,
    box: rect,
    flow,
    line: slot.line
  };
}

/** Equal for targets that draw the same indicator, so drag-overs don't re-render it. */
export function dropTargetKey(target: DropTarget | null) {
  if (!target) return '';
  return [
    target.kind,
    target.parentId,
    target.kind === 'slot' ? target.index : '',
    Math.round(target.box.left),
    Math.round(target.box.top),
    target.kind === 'slot' ? Math.round(target.line.left + target.line.top) : ''
  ].join(':');
}

/** The label of the container a drop lands in. */
export function dropParentLabel(nodes: UiNode[], parentId: string | null) {
  if (parentId === null) return 'page';
  return findNode(nodes, parentId)?.label.trim() || 'container';
}

/** The indicator's pill for an insertion. */
export function dropLabel(nodes: UiNode[], target: DropTarget) {
  return target.kind === 'slot' ? 'Insert here' : `Into ${dropParentLabel(nodes, target.parentId)}`;
}

export function Pill({ children }: { children: string }) {
  return (
    <span className='bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shadow'>
      {children}
    </span>
  );
}

/** The insertion line (or the target container, for an empty one) while something is dragged over. */
export function DropIndicator({ target, label }: { target: DropTarget; label: string }) {
  return createPortal(
    <div
      style={{
        left: target.box.left,
        top: target.box.top,
        width: target.box.width,
        height: target.box.height
      }}
      className='pointer-events-none fixed z-[1000]'
    >
      {target.kind === 'slot' ? (
        <div
          style={target.line}
          className='bg-primary absolute rounded-full shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_20%,transparent)]'
        />
      ) : (
        <div className='border-primary/70 absolute inset-0 rounded-md border border-dashed' />
      )}
      <div className='absolute inset-x-0 -top-6 flex justify-center'>
        <Pill>{label}</Pill>
      </div>
    </div>,
    document.body
  );
}
