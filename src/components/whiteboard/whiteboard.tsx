'use client';

import '@excalidraw/excalidraw/index.css';

import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  Excalidraw,
  getSceneVersion
} from '@excalidraw/excalidraw';
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  NormalizedZoomValue
} from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface WhiteboardScene {
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
  appState?: Partial<Pick<AppState, 'viewBackgroundColor'>>;
}

/** Excalidraw viewport: `x`/`y` are its scrollX/scrollY (scene units), `zoom` its scale. */
export interface WhiteboardCamera {
  x: number;
  y: number;
  zoom: number;
}

export interface WhiteboardProps {
  initialScene?: WhiteboardScene | null;
  /** Fires only when elements or files change, not on pointer moves or selection. */
  onSceneChange?: (scene: WhiteboardScene) => void;
  theme?: 'light' | 'dark';
  /** Transparent canvas so the board can sit over other content (e.g. a graph). */
  transparent?: boolean;
  /** Controlled viewport, for syncing the board with an underlying canvas's camera. */
  camera?: WhiteboardCamera;
  onCameraChange?: (camera: WhiteboardCamera) => void;
  className?: string;
}

const STICKY_SIZE = 200;

function sceneSignature(elements: readonly ExcalidrawElement[], files: BinaryFiles) {
  return `${getSceneVersion(elements)}:${Object.keys(files).length}`;
}

export function Whiteboard({
  initialScene,
  onSceneChange,
  theme = 'light',
  transparent = false,
  camera,
  onCameraChange,
  className
}: WhiteboardProps) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const signatureRef = useRef(
    initialScene ? sceneSignature(initialScene.elements, initialScene.files) : ''
  );
  const cameraRef = useRef<WhiteboardCamera | null>(null);
  const callbacksRef = useRef({ onSceneChange, onCameraChange });
  useLayoutEffect(() => {
    callbacksRef.current = { onSceneChange, onCameraChange };
  });

  const [initialData] = useState(() => ({
    elements: initialScene?.elements ?? [],
    files: initialScene?.files ?? {},
    appState: {
      ...initialScene?.appState,
      ...(transparent ? { viewBackgroundColor: 'transparent' } : {})
    },
    scrollToContent: !camera
  }));

  useEffect(() => {
    if (!api || !camera) return;
    const current = cameraRef.current;
    if (
      current &&
      current.x === camera.x &&
      current.y === camera.y &&
      current.zoom === camera.zoom
    ) {
      return;
    }
    cameraRef.current = camera;
    api.updateScene({
      appState: {
        scrollX: camera.x,
        scrollY: camera.y,
        zoom: { value: camera.zoom as NormalizedZoomValue }
      },
      captureUpdate: CaptureUpdateAction.NEVER
    });
  }, [api, camera]);

  function handleChange(
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ) {
    const { onSceneChange: onScene, onCameraChange: onCamera } = callbacksRef.current;

    const signature = sceneSignature(elements, files);
    if (signature !== signatureRef.current) {
      signatureRef.current = signature;
      onScene?.({
        elements,
        files,
        appState: transparent ? {} : { viewBackgroundColor: appState.viewBackgroundColor }
      });
    }

    const next = { x: appState.scrollX, y: appState.scrollY, zoom: appState.zoom.value };
    const prev = cameraRef.current;
    if (!prev || prev.x !== next.x || prev.y !== next.y || prev.zoom !== next.zoom) {
      cameraRef.current = next;
      onCamera?.(next);
    }
  }

  function addStickyNote() {
    if (!api) return;
    const { scrollX, scrollY, zoom, width, height } = api.getAppState();
    const x = -scrollX + width / 2 / zoom.value - STICKY_SIZE / 2;
    const y = -scrollY + height / 2 / zoom.value - STICKY_SIZE / 2;
    const note = convertToExcalidrawElements([
      {
        type: 'rectangle',
        x,
        y,
        width: STICKY_SIZE,
        height: STICKY_SIZE,
        backgroundColor: '#ffec99',
        strokeColor: '#f08c00',
        fillStyle: 'solid',
        roundness: { type: 3 },
        label: { text: 'Note', fontSize: 20, strokeColor: '#1e1e1e' }
      }
    ]);
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), ...note],
      appState: { selectedElementIds: { [note[0].id]: true } },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY
    });
  }

  return (
    <div className={className} style={{ height: '100%', width: '100%' }}>
      <Excalidraw
        excalidrawAPI={setApi}
        initialData={initialData}
        onChange={handleChange}
        theme={theme}
        UIOptions={{ canvasActions: { changeViewBackgroundColor: !transparent } }}
        renderTopRightUI={() => (
          <button
            type='button'
            onClick={addStickyNote}
            title='Add sticky note'
            style={{
              height: '2.25rem',
              padding: '0 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #f08c00',
              background: '#ffec99',
              color: '#1e1e1e',
              fontSize: '0.8125rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            Sticky note
          </button>
        )}
      />
    </div>
  );
}
