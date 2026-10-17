'use client';

import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { DesignLayer, UiNode } from '../../api/types';
import { findNode, NODE_LABELS } from '../../lib/node-tree';
import { NODE_ICONS } from './node-icons';

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface HoveredElement {
  layerId: string;
  node: UiNode;
  box: Box;
  /** Too close to the top of the canvas for the bubble to fit above. */
  below: boolean;
  /** The canvas's horizontal extent, which the bubble stays inside. */
  bounds: { left: number; right: number };
}

const BUBBLE_ROOM = 72;
const EDGE_GAP = 8;

/**
 * Highlights the element of the selected layer's sketch under the pointer, with a bubble naming
 * it. The sketches sit under the drawing board and never get pointer events, so the board's
 * pointer moves are hit-tested against them here.
 */
export function useSketchHover(
  screensRef: RefObject<HTMLElement | null>,
  layer: DesignLayer | null
) {
  const [hovered, setHovered] = useState<HoveredElement | null>(null);

  function clear() {
    setHovered(null);
  }

  function update(event: ReactPointerEvent) {
    const next = hitTest(event.clientX, event.clientY);
    setHovered((prev) => (sameHover(prev, next) ? prev : next));
  }

  function hitTest(x: number, y: number): HoveredElement | null {
    const root = screensRef.current;
    if (!root || !layer?.screen) return null;
    const frame = root.querySelector<HTMLElement>(`.react-flow__node[data-id="${layer.id}"]`);
    const body = frame?.querySelector<HTMLElement>('[data-sketch-body]');
    const bounds = root.getBoundingClientRect();
    if (!frame || !body) return null;
    // Only what shows through the screen's body, which may be scrolled, can be hovered.
    const visibleArea = intersect(body.getBoundingClientRect(), bounds);
    if (!inside(visibleArea, x, y)) return null;
    // Descendants come after their ancestors, so the last hit is the innermost element.
    let target: HTMLElement | null = null;
    for (const element of frame.querySelectorAll<HTMLElement>('[data-node-id]')) {
      if (inside(element.getBoundingClientRect(), x, y)) target = element;
    }
    const node = target?.dataset.nodeId
      ? findNode(layer.screen.nodes, target.dataset.nodeId)
      : null;
    if (!target || !node) return null;
    const visible = intersect(target.getBoundingClientRect(), visibleArea);
    const box = {
      left: visible.left,
      top: visible.top,
      width: visible.width,
      height: visible.height
    };
    return {
      layerId: layer.id,
      node,
      box,
      below: box.top - bounds.top < BUBBLE_ROOM,
      bounds: { left: bounds.left, right: bounds.right }
    };
  }

  const visible = hovered && hovered.layerId === layer?.id ? hovered : null;
  const overlay = visible ? createPortal(<HoverOverlay hovered={visible} />, document.body) : null;

  function elementAt(x: number, y: number) {
    return hitTest(x, y)?.node ?? null;
  }

  return { update, clear, elementAt, overlay };
}

function HoverOverlay({ hovered }: { hovered: HoveredElement }) {
  const { node, box, below, bounds } = hovered;
  const NodeIcon = NODE_ICONS[node.type];
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Centered over the element, but nudged sideways to stay inside the canvas.
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble) return;
    bubble.style.marginLeft = '';
    const rect = bubble.getBoundingClientRect();
    const left = bounds.left + EDGE_GAP - rect.left;
    const right = bounds.right - EDGE_GAP - rect.right;
    bubble.style.marginLeft = `${left > 0 ? left : Math.min(right, 0)}px`;
  }, [hovered]);

  return (
    <div className='pointer-events-none fixed z-[1000]' style={box}>
      <div className='ring-primary bg-primary/5 absolute inset-0 rounded-sm ring-2' />
      <div
        ref={bubbleRef}
        className={cn(
          'bg-popover text-popover-foreground absolute left-1/2 w-max max-w-64 -translate-x-1/2 rounded-md border px-2.5 py-1.5 text-xs shadow-md',
          below ? 'top-full mt-2' : 'bottom-full mb-2'
        )}
      >
        <div className='flex items-center gap-1.5 font-medium'>
          <NodeIcon className='text-muted-foreground size-3.5 shrink-0' />
          <span className='truncate'>{node.label || NODE_LABELS[node.type]}</span>
        </div>
        {node.description ? (
          <p className='text-muted-foreground mt-0.5 leading-snug'>{node.description}</p>
        ) : null}
      </div>
    </div>
  );
}

function inside(rect: DOMRect, x: number, y: number) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function intersect(a: DOMRect, b: DOMRect): DOMRect {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const width = Math.max(0, Math.min(a.right, b.right) - left);
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - top);
  return new DOMRect(left, top, width, height);
}

function sameHover(a: HoveredElement | null, b: HoveredElement | null) {
  if (!a || !b) return a === b;
  return (
    a.node === b.node &&
    a.below === b.below &&
    a.box.left === b.box.left &&
    a.box.top === b.box.top &&
    a.box.width === b.box.width &&
    a.box.height === b.box.height
  );
}
