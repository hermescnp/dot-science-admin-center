import type { CSSProperties } from 'react';
import {
  LAYOUT_HANDLE_IDS,
  LAYOUT_HANDLES,
  type LayoutHandle,
  type LayoutRect
} from '../../lib/layout-drag';

const ACCENT = '#3c82f7';
const GUIDE = '#ff00ff';

function rectStyle(rect: LayoutRect): CSSProperties {
  return {
    position: 'absolute',
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height
  };
}

export function handleCursor(handle: LayoutHandle) {
  return `${handle}-resize`;
}

function chip(background: string, unit: number): CSSProperties {
  return {
    position: 'absolute',
    fontSize: 10 * unit,
    lineHeight: 1.3,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    whiteSpace: 'nowrap',
    padding: `${2 * unit}px ${6 * unit}px`,
    borderRadius: 4 * unit,
    background,
    color: '#fff',
    fontWeight: 600,
    boxShadow: `0 ${unit}px ${4 * unit}px rgba(0,0,0,0.2)`
  };
}

interface PreviewRootMarksProps {
  unit: number;
  rootRect: LayoutRect;
  /** Outline the root with its height: the handle is hovered or dragged. */
  active: boolean;
  dragging: boolean;
}

/** The preview root's height handle, a pill just below its content. */
export function PreviewRootMarks({ unit, rootRect, active, dragging }: PreviewRootMarksProps) {
  const bottom = rootRect.y + rootRect.height;
  return (
    <>
      {active ? (
        <div
          style={{
            ...rectStyle(rootRect),
            outline: `${1.5 * unit}px dashed ${ACCENT}`,
            borderRadius: 2 * unit
          }}
        >
          <span
            style={{
              ...chip(ACCENT, unit),
              right: 0,
              top: `calc(100% + ${4 * unit}px)`,
              fontWeight: 500
            }}
          >
            {`height ${Math.round(rootRect.height)}`}
          </span>
        </div>
      ) : null}
      <span
        data-root-handle=''
        title='Drag to change the height'
        style={{
          position: 'absolute',
          left: rootRect.x + rootRect.width / 2,
          top: bottom + 6 * unit,
          width: 32 * unit,
          height: 6 * unit,
          transform: 'translate(-50%, -50%)',
          background: active ? ACCENT : '#fff',
          border: `${1.5 * unit}px solid ${ACCENT}`,
          borderRadius: 3 * unit,
          boxShadow: `0 ${unit}px ${2 * unit}px rgba(0,0,0,0.2)`,
          cursor: 'ns-resize',
          pointerEvents: dragging ? 'none' : 'auto'
        }}
      />
    </>
  );
}

interface PreviewLayoutMarksProps {
  /** Frame pixels per screen pixel, so marks keep their screen size at any zoom. */
  unit: number;
  frameWidth: number;
  frameHeight: number;
  hoverRect: LayoutRect | null;
  originalRect: LayoutRect | null;
  selectedRect: LayoutRect | null;
  selectedLabel: string;
  /** Shown while dragging: the selection's position is part of the size chip. */
  dragging: boolean;
  guidesX: number[];
  guidesY: number[];
  moved: boolean;
  resized: boolean;
}

/** Hover outline, selection box with handles and chips, the original box and the snap guides. */
export function PreviewLayoutMarks({
  unit,
  frameWidth,
  frameHeight,
  hoverRect,
  originalRect,
  selectedRect,
  selectedLabel,
  dragging,
  guidesX,
  guidesY,
  moved,
  resized
}: PreviewLayoutMarksProps) {
  return (
    <>
      {hoverRect ? (
        <div
          style={{
            ...rectStyle(hoverRect),
            outline: `${1.5 * unit}px dashed rgba(59,130,246,0.7)`,
            background: 'rgba(59,130,246,0.06)',
            borderRadius: 2 * unit
          }}
        />
      ) : null}

      {originalRect && (moved || resized) ? (
        <div
          style={{
            ...rectStyle(originalRect),
            outline: `${1.5 * unit}px dashed rgba(150,150,150,0.6)`,
            borderRadius: 2 * unit
          }}
        />
      ) : null}

      {selectedRect ? (
        <div
          style={{
            ...rectStyle(selectedRect),
            outline: `${2 * unit}px solid ${ACCENT}`,
            background: 'rgba(59,130,246,0.08)'
          }}
        >
          <span
            style={{
              ...chip(ACCENT, unit),
              left: -2 * unit,
              ...(selectedRect.y > 22 * unit
                ? { bottom: `calc(100% + ${4 * unit}px)` }
                : { top: 4 * unit })
            }}
          >
            {selectedLabel}
          </span>
          <span
            style={{
              ...chip('rgba(15,23,42,0.8)', unit),
              right: -2 * unit,
              top: `calc(100% + ${4 * unit}px)`,
              fontWeight: 500,
              display: 'flex',
              gap: 6 * unit
            }}
          >
            {dragging ? (
              <span>{`x ${Math.round(selectedRect.x)} · y ${Math.round(selectedRect.y)}`}</span>
            ) : null}
            <span>{`${Math.round(selectedRect.width)} × ${Math.round(selectedRect.height)}`}</span>
            {moved ? <span style={{ color: '#4ade80' }}>Moved</span> : null}
            {resized ? <span style={{ color: '#93c5fd' }}>Resized</span> : null}
          </span>
          {LAYOUT_HANDLE_IDS.map((handle) => {
            const [hx, hy] = LAYOUT_HANDLES[handle];
            const corner = hx !== 0 && hy !== 0;
            return (
              <span
                key={handle}
                data-handle={handle}
                style={{
                  position: 'absolute',
                  left: `${((hx + 1) / 2) * 100}%`,
                  top: `${((hy + 1) / 2) * 100}%`,
                  width: (corner ? 9 : hx === 0 ? 18 : 6) * unit,
                  height: (corner ? 9 : hy === 0 ? 18 : 6) * unit,
                  transform: 'translate(-50%, -50%)',
                  background: corner ? '#fff' : ACCENT,
                  border: corner ? `${1.5 * unit}px solid ${ACCENT}` : undefined,
                  borderRadius: (corner ? 2 : 3) * unit,
                  boxShadow: `0 ${unit}px ${2 * unit}px rgba(0,0,0,0.2)`,
                  cursor: handleCursor(handle),
                  pointerEvents: dragging ? 'none' : 'auto'
                }}
              />
            );
          })}
        </div>
      ) : null}

      {guidesX.map((x) => (
        <div
          key={`gx${x}`}
          style={{
            position: 'absolute',
            left: x,
            top: 0,
            width: unit,
            height: frameHeight,
            background: GUIDE,
            opacity: 0.7
          }}
        />
      ))}
      {guidesY.map((y) => (
        <div
          key={`gy${y}`}
          style={{
            position: 'absolute',
            left: 0,
            top: y,
            width: frameWidth,
            height: unit,
            background: GUIDE,
            opacity: 0.7
          }}
        />
      ))}
    </>
  );
}
