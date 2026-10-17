'use client';

import { useReactFlow, useStore } from '@xyflow/react';
import { useEffect, useRef } from 'react';

/** Excalidraw's zoom range and step, so both design views move the same way. */
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 30;
const ZOOM_STEP = 0.1;

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

export function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * The selected screen's scroller when the pointer is anywhere over that screen and its content
 * overflows: the screen then owns the wheel, so its scrolling never turns into a pan.
 */
function scrollableScreenAt(root: HTMLElement, event: WheelEvent) {
  const scroller = root.querySelector<HTMLElement>('[data-screen-scroll]');
  if (!scroller || scroller.scrollHeight - scroller.clientHeight < 1) return null;
  const rect = (scroller.closest('.react-flow__node') ?? scroller).getBoundingClientRect();
  const { clientX: x, clientY: y } = event;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom ? scroller : null;
}

/** Zoom actions for the flow's viewport; buttons and shortcuts zoom around the canvas centre. */
export function useCanvasZoom() {
  const { getViewport, setViewport, fitView } = useReactFlow();
  const domNode = useStore((state) => state.domNode);

  function zoomAt(nextZoom: number, x: number, y: number) {
    const current = getViewport();
    const zoom = clampZoom(nextZoom);
    const ratio = zoom / current.zoom;
    void setViewport({ x: x - (x - current.x) * ratio, y: y - (y - current.y) * ratio, zoom });
  }

  function zoomAtCenter(nextZoom: number) {
    const rect = domNode?.getBoundingClientRect();
    zoomAt(nextZoom, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2);
  }

  return {
    zoomAt,
    zoomIn: () => zoomAtCenter(getViewport().zoom + ZOOM_STEP),
    zoomOut: () => zoomAtCenter(getViewport().zoom - ZOOM_STEP),
    resetZoom: () => zoomAtCenter(1),
    fit: () => void fitView({ padding: 0.2, maxZoom: 1 })
  };
}

/**
 * Excalidraw-style navigation for the flow: wheel / two-finger swipe pans (Shift makes a
 * vertical wheel horizontal), ⌘/Ctrl + wheel and pinch zoom at the pointer, Space + drag or
 * middle-button drag pans, and ⌘+ / ⌘− / ⌘0 / Shift+1 zoom. Render inside `<ReactFlow>`.
 */
export function CanvasNavigation() {
  const domNode = useStore((state) => state.domNode);
  const { getViewport, setViewport } = useReactFlow();
  const zoom = useCanvasZoom();

  const latest = useRef({ zoom, getViewport, setViewport });
  useEffect(() => {
    latest.current = { zoom, getViewport, setViewport };
  });

  useEffect(() => {
    if (!domNode) return;
    const root = domNode;
    let spaceHeld = false;
    let pointerInside = false;
    let pan: { id: number; button: number; x: number; y: number } | null = null;
    let suppressClick = false;
    let gestureScale = 1;

    const setHand = (state: 'ready' | 'panning' | null) => {
      if (state) root.dataset.hand = state;
      else delete root.dataset.hand;
    };
    const local = (event: { clientX: number; clientY: number }) => {
      const rect = root.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top] as const;
    };
    const panBy = (dx: number, dy: number) => {
      const current = latest.current.getViewport();
      void latest.current.setViewport({ ...current, x: current.x + dx, y: current.y + dy });
    };

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      event.stopPropagation();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? root.clientHeight : 1;
      const dx = event.deltaX * unit;
      const dy = event.deltaY * unit;

      const modified = event.ctrlKey || event.metaKey || event.shiftKey;
      const scroller = modified ? null : scrollableScreenAt(root, event);
      if (scroller) {
        // The screen is drawn at the canvas zoom; move the content as far as the wheel moved.
        const scale = scroller.getBoundingClientRect().height / scroller.offsetHeight || 1;
        scroller.scrollTop += dy / scale;
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        // Excalidraw's wheel zoom: one step at most per event, faster when zoomed in.
        const sign = Math.sign(dy);
        const abs = Math.abs(dy);
        const delta = abs > ZOOM_STEP * 100 ? ZOOM_STEP * 100 * sign : dy;
        const current = latest.current.getViewport().zoom;
        const next =
          current - delta / 100 + Math.log10(Math.max(1, current)) * -sign * Math.min(1, abs / 20);
        latest.current.zoom.zoomAt(next, ...local(event));
        return;
      }

      const [panX, panY] = event.shiftKey && dx === 0 ? [dy, 0] : [dx, dy];
      panBy(-panX, -panY);
    }

    function onPointerDown(event: PointerEvent) {
      if (!(event.button === 1 || (event.button === 0 && spaceHeld))) return;
      event.preventDefault();
      event.stopPropagation();
      pan = { id: event.pointerId, button: event.button, x: event.clientX, y: event.clientY };
      setHand('panning');
    }

    function onPointerMove(event: PointerEvent) {
      if (!pan || event.pointerId !== pan.id) return;
      panBy(event.clientX - pan.x, event.clientY - pan.y);
      pan = { ...pan, x: event.clientX, y: event.clientY };
    }

    function onPointerUp(event: PointerEvent) {
      if (!pan || event.pointerId !== pan.id) return;
      // Only a left-button pan is followed by a click that would select what's under it.
      suppressClick = pan.button === 0;
      pan = null;
      setHand(spaceHeld ? 'ready' : null);
    }

    function onClick(event: MouseEvent) {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    }

    // Stops the browser's middle-click autoscroll.
    function onMouseDown(event: MouseEvent) {
      if (event.button === 1) event.preventDefault();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!pointerInside || isTyping(event.target)) return;
      const mod = event.metaKey || event.ctrlKey;

      if (event.code === 'Space' && !mod && !event.altKey) {
        event.preventDefault();
        if (!spaceHeld) {
          spaceHeld = true;
          if (!pan) setHand('ready');
        }
        return;
      }

      const { zoom: actions } = latest.current;
      if (mod && (event.key === '=' || event.key === '+')) actions.zoomIn();
      else if (mod && event.key === '-') actions.zoomOut();
      else if (mod && event.key === '0') actions.resetZoom();
      else if (event.shiftKey && !mod && event.code === 'Digit1') actions.fit();
      else return;
      event.preventDefault();
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.code !== 'Space' || !spaceHeld) return;
      spaceHeld = false;
      if (!pan) setHand(null);
    }

    function onBlur() {
      spaceHeld = false;
      pan = null;
      setHand(null);
    }

    // Safari reports trackpad pinches as gesture events instead of ⌘ + wheel.
    function onGestureStart(event: Event) {
      event.preventDefault();
      gestureScale = 1;
    }
    function onGestureChange(event: Event) {
      event.preventDefault();
      const gesture = event as Event & { clientX: number; clientY: number; scale: number };
      const current = latest.current.getViewport().zoom;
      latest.current.zoom.zoomAt(current * (gesture.scale / gestureScale), ...local(gesture));
      gestureScale = gesture.scale;
    }

    const onEnter = () => (pointerInside = true);
    const onLeave = () => (pointerInside = false);

    root.addEventListener('wheel', onWheel, { capture: true, passive: false });
    root.addEventListener('pointerdown', onPointerDown, { capture: true });
    root.addEventListener('mousedown', onMouseDown, { capture: true });
    root.addEventListener('click', onClick, { capture: true });
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('gesturestart', onGestureStart);
    root.addEventListener('gesturechange', onGestureChange);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      root.removeEventListener('wheel', onWheel, { capture: true });
      root.removeEventListener('pointerdown', onPointerDown, { capture: true });
      root.removeEventListener('mousedown', onMouseDown, { capture: true });
      root.removeEventListener('click', onClick, { capture: true });
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('gesturestart', onGestureStart);
      root.removeEventListener('gesturechange', onGestureChange);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      setHand(null);
    };
  }, [domNode]);

  return null;
}
