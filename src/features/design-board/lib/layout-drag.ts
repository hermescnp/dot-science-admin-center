/** A box in a frame, in frame pixels from its top-left corner. */
export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutPoint {
  x: number;
  y: number;
}

export type LayoutHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const LAYOUT_HANDLES: Record<LayoutHandle, [number, number]> = {
  nw: [-1, -1],
  n: [0, -1],
  ne: [1, -1],
  e: [1, 0],
  se: [1, 1],
  s: [0, 1],
  sw: [-1, 1],
  w: [-1, 0]
};
export const LAYOUT_HANDLE_IDS = Object.keys(LAYOUT_HANDLES) as LayoutHandle[];
export const SNAP_DISTANCE = 6;
export const MIN_SIZE = 8;
/** Screen pixels the pointer travels before a press becomes a drag. */
export const DRAG_THRESHOLD = 3;
export const HISTORY_LIMIT = 100;

/** The closest snap target to any of the values, as the shift to apply and the guide to draw. */
export function snapAxis(values: number[], targets: number[], enabled: boolean) {
  if (!enabled) return { delta: 0, line: null as number | null };
  let best: { delta: number; line: number } | null = null;
  for (const value of values) {
    for (const target of targets) {
      const delta = target - value;
      if (Math.abs(delta) <= SNAP_DISTANCE && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, line: target };
      }
    }
  }
  return best ?? { delta: 0, line: null };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function contains(rect: LayoutRect, point: LayoutPoint) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function sameRect(a: LayoutRect, b: LayoutRect, key: 'position' | 'size') {
  return key === 'position'
    ? Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5
    : Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}

/** Snap targets of a box: its edges and center, plus the edges and centers of the given boxes. */
export function snapTargets(frame: LayoutRect, others: LayoutRect[]) {
  const targetsX = [frame.x, frame.x + frame.width / 2, frame.x + frame.width];
  const targetsY = [frame.y, frame.y + frame.height / 2, frame.y + frame.height];
  for (const rect of others) {
    if (rect.width <= 0 || rect.height <= 0) continue;
    targetsX.push(rect.x, rect.x + rect.width / 2, rect.x + rect.width);
    targetsY.push(rect.y, rect.y + rect.height / 2, rect.y + rect.height);
  }
  return { targetsX, targetsY };
}

export interface DragInput {
  start: LayoutRect;
  handle: LayoutHandle | 'move';
  dx: number;
  dy: number;
  targetsX: number[];
  targetsY: number[];
  /** Where the box may go, in the same frame pixels. */
  bounds: LayoutRect;
  snap: boolean;
  /** Keep proportions on corner handles. */
  keepRatio: boolean;
  fromCenter: boolean;
}

/** The box a move or resize gesture leads to, with the snap guides it lined up on. */
export function computeDragRect({
  start,
  handle,
  dx,
  dy,
  targetsX,
  targetsY,
  bounds,
  snap,
  keepRatio,
  fromCenter
}: DragInput) {
  const guidesX: number[] = [];
  const guidesY: number[] = [];
  const maxX = bounds.x + bounds.width;
  const maxY = bounds.y + bounds.height;

  if (handle === 'move') {
    let x = start.x + dx;
    let y = start.y + dy;
    const snapX = snapAxis([x, x + start.width / 2, x + start.width], targetsX, snap);
    const snapY = snapAxis([y, y + start.height / 2, y + start.height], targetsY, snap);
    x += snapX.delta;
    y += snapY.delta;
    if (snapX.line !== null) guidesX.push(snapX.line);
    if (snapY.line !== null) guidesY.push(snapY.line);
    return {
      rect: {
        x: clamp(x, bounds.x, maxX - start.width),
        y: clamp(y, bounds.y, maxY - start.height),
        width: start.width,
        height: start.height
      },
      guidesX,
      guidesY
    };
  }

  const [hx, hy] = LAYOUT_HANDLES[handle];
  let left = start.x;
  let right = start.x + start.width;
  let top = start.y;
  let bottom = start.y + start.height;

  if (hx === 1) {
    const snapped = snapAxis([right + dx], targetsX, snap);
    right += dx + snapped.delta;
    if (snapped.line !== null) guidesX.push(snapped.line);
    if (fromCenter) left -= dx + snapped.delta;
  } else if (hx === -1) {
    const snapped = snapAxis([left + dx], targetsX, snap);
    left += dx + snapped.delta;
    if (snapped.line !== null) guidesX.push(snapped.line);
    if (fromCenter) right -= dx + snapped.delta;
  }
  if (hy === 1) {
    const snapped = snapAxis([bottom + dy], targetsY, snap);
    bottom += dy + snapped.delta;
    if (snapped.line !== null) guidesY.push(snapped.line);
    if (fromCenter) top -= dy + snapped.delta;
  } else if (hy === -1) {
    const snapped = snapAxis([top + dy], targetsY, snap);
    top += dy + snapped.delta;
    if (snapped.line !== null) guidesY.push(snapped.line);
    if (fromCenter) bottom -= dy + snapped.delta;
  }

  if (keepRatio && hx !== 0 && hy !== 0 && start.width > 0 && start.height > 0) {
    const ratio = start.width / start.height;
    let width = right - left;
    let height = bottom - top;
    if (Math.abs(width / start.width) > Math.abs(height / start.height)) height = width / ratio;
    else width = height * ratio;
    if (fromCenter) {
      const centerX = start.x + start.width / 2;
      const centerY = start.y + start.height / 2;
      left = centerX - width / 2;
      right = centerX + width / 2;
      top = centerY - height / 2;
      bottom = centerY + height / 2;
    } else {
      if (hx === 1) right = left + width;
      else left = right - width;
      if (hy === 1) bottom = top + height;
      else top = bottom - height;
    }
    guidesX.length = 0;
    guidesY.length = 0;
  }

  if (right - left < MIN_SIZE) {
    if (hx === -1) left = right - MIN_SIZE;
    else right = left + MIN_SIZE;
  }
  if (bottom - top < MIN_SIZE) {
    if (hy === -1) top = bottom - MIN_SIZE;
    else bottom = top + MIN_SIZE;
  }
  left = Math.max(bounds.x, left);
  top = Math.max(bounds.y, top);
  right = Math.min(maxX, right);
  bottom = Math.min(maxY, bottom);
  return {
    rect: { x: left, y: top, width: right - left, height: bottom - top },
    guidesX,
    guidesY
  };
}

/** Moves a box by a step without leaving its bounds; returns the step actually taken. */
export function clampedStep(rect: LayoutRect, bounds: LayoutRect, dx: number, dy: number) {
  return {
    dx: clamp(rect.x + dx, bounds.x, bounds.x + bounds.width - rect.width) - rect.x,
    dy: clamp(rect.y + dy, bounds.y, bounds.y + bounds.height - rect.height) - rect.y
  };
}
