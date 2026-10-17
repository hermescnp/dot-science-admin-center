import { create } from 'zustand';
import type { WhiteboardCamera } from '@/components/whiteboard';

/** React Flow viewport: a scene point `p` lands on screen at `p * zoom + x`. */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface CameraStore {
  cameras: Record<string, Viewport>;
  setCamera: (sectionId: string, viewport: Viewport) => void;
}

export const useCameraStore = create<CameraStore>((set) => ({
  cameras: {},
  setCamera: (sectionId, viewport) =>
    set((state) => ({ cameras: { ...state.cameras, [sectionId]: viewport } }))
}));

/** Excalidraw draws a scene point `p` at `(p + scroll) * zoom`. */
export function toWhiteboardCamera(viewport: Viewport): WhiteboardCamera {
  return { x: viewport.x / viewport.zoom, y: viewport.y / viewport.zoom, zoom: viewport.zoom };
}

export function fromWhiteboardCamera(camera: WhiteboardCamera): Viewport {
  return { x: camera.x * camera.zoom, y: camera.y * camera.zoom, zoom: camera.zoom };
}

let commitCanvas: (() => void) | null = null;

/** The free-design canvas registers how to push its unsaved elements into the query cache. */
export function registerCanvasCommit(commit: () => void) {
  commitCanvas = commit;
  return () => {
    if (commitCanvas === commit) commitCanvas = null;
  };
}

/** Called before switching views so the next view mounts with the latest drawings. */
export function commitPendingCanvas() {
  commitCanvas?.();
}
