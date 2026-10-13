/**
 * Small stand-ins for the Hermes desktop helpers the Star Map relies on
 * (nanostores atom, trackpad gestures, renderer loop pause).
 */

export interface RevealStore {
  get: () => number;
  set: (value: number) => void;
  subscribe: (listener: (value: number) => void) => () => void;
}

/** Subscribers are called immediately with the current value, like a nanostores atom. */
export function createRevealStore(initial: number): RevealStore {
  let value = initial;
  const listeners = new Set<(value: number) => void>();
  return {
    get: () => value,
    set: (next) => {
      if (next === value) return;
      value = next;
      listeners.forEach((listener) => listener(value));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener(value);
      return () => listeners.delete(listener);
    }
  };
}

/** macOS "smart zoom" (two-finger double-tap) arrives as a ctrl-wheel with no delta. */
export function isSmartZoomWheel(e: { ctrlKey: boolean; deltaX: number; deltaY: number }) {
  return e.ctrlKey && e.deltaX === 0 && e.deltaY === 0;
}

/** Double-tap detection for trackpads where a real `dblclick` may never fire. */
export function createDoubleTapDetector(thresholdMs = 300) {
  let last = 0;
  return (now: number = Date.now()) => {
    if (now - last < thresholdMs) {
      last = 0;
      return true;
    }
    last = now;
    return false;
  };
}

/** Pauses the render loop while the tab is hidden. */
export function createRendererLoopPauseController(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return {
    dispose: () => document.removeEventListener('visibilitychange', onChange),
    isPaused: () => document.visibilityState === 'hidden'
  };
}

/** Space toggles playback unless the user is typing or a control already handles the key. */
export function shouldIgnorePlaybackHotkey(e: KeyboardEvent, active: Element | null) {
  if (e.code !== 'Space' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return true;
  if (!active || active === document.body) return false;
  const tag = active.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    tag === 'BUTTON' ||
    (active as HTMLElement).isContentEditable ||
    active.getAttribute('role') === 'menuitem' ||
    active.getAttribute('role') === 'slider'
  );
}
