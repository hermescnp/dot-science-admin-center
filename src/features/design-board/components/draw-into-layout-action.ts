'use client';

import type {
  ExcalidrawElement,
  ExcalidrawFrameLikeElement
} from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { toast } from 'sonner';
import { drawIntoLayout } from '../api/service';
import type { DesignLayer, UiNode } from '../api/types';
import {
  describeMockupElements,
  domToScene,
  drawingsOverScreen,
  screenDeviceOf,
  screensWithDrawings
} from '../lib/draw-into-layout';
import { captureRegion, withArrowLabelsOnArrows } from '../lib/frame-capture';
import type { DrawIntoLayoutState } from './interface/screens-flow';

/** Long enough to look at the new layout before deciding to undo it. */
const UNDO_TOAST_DURATION = 12_000;

interface DrawIntoLayoutOptions {
  api: ExcalidrawImperativeAPI | null;
  /** The element holding the sketched screens, under the board. */
  screensRef: RefObject<HTMLElement | null>;
  activeLayer: DesignLayer | null;
  /** Replaces the nodes of `layerId`'s screen, whether or not it is still the active layer. */
  setScreenNodes: (layerId: string, nodes: UiNode[]) => void;
}

/** Marks the elements with `ids` deleted or back, keeping the rest of the scene as is. */
async function setDeleted(api: ExcalidrawImperativeAPI, ids: Set<string>, isDeleted: boolean) {
  const { newElementWith, CaptureUpdateAction } = await import('@excalidraw/excalidraw');
  api.updateScene({
    elements: api
      .getSceneElementsIncludingDeleted()
      .map((element) => (ids.has(element.id) ? newElementWith(element, { isDeleted }) : element)),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY
  });
}

/**
 * Drawings over the active mockup screen turned into its layout: the button shows while there
 * are some, and a click captures the screen with them, has the model update the structure,
 * applies it and removes the drawings, with Undo in the toast.
 */
export function useDrawIntoLayout(options: DrawIntoLayoutOptions) {
  const { api, screensRef, activeLayer } = options;
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });
  const [available, setAvailable] = useState(false);
  const [busyLayerId, setBusyLayerId] = useState<string | null>(null);
  const [drawnKey, setDrawnKey] = useState('');
  const drawnOver = useMemo<ReadonlySet<string>>(
    () => new Set(drawnKey ? drawnKey.split(',') : []),
    [drawnKey]
  );

  function current() {
    if (!api || !activeLayer?.screen) return null;
    const device = screenDeviceOf(screensRef.current, activeLayer.id);
    if (!device) return null;
    const rect = domToScene(device.getBoundingClientRect(), api.getAppState());
    const drawings = drawingsOverScreen(api.getSceneElements(), rect, activeLayer.id);
    return drawings.length ? { layer: activeLayer, device, rect, drawings } : null;
  }

  function refresh() {
    setAvailable(Boolean(current()));
    setDrawnKey(drawnOverKey());
  }

  /** The empty screens with drawings over them, the only ones showing a placeholder to hide. */
  function drawnOverKey() {
    if (!api || !screensRef.current) return '';
    const camera = api.getAppState();
    const screens = [
      ...screensRef.current.querySelectorAll<HTMLElement>('.react-flow__node[data-id]')
    ].flatMap((node) => {
      const device = node.querySelector<HTMLElement>('[data-screen-device]');
      return device && !device.querySelector('[data-node-id]')
        ? [{ layerId: node.dataset.id!, rect: domToScene(device.getBoundingClientRect(), camera) }]
        : [];
    });
    return [...screensWithDrawings(api.getSceneElements(), screens)].sort().join(',');
  }
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  const screen = activeLayer?.screen;
  useEffect(() => {
    if (!api) return;
    // Once a frame at most, after the screens have re-rendered: the board reports every change,
    // its initial load and camera moves included.
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        refreshRef.current();
      });
    };
    schedule();
    const unsubscribe = api.onChange(schedule);
    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
    };
  }, [api, activeLayer?.id, screen?.x, screen?.y, screen?.height, screen?.device, screen?.nodes]);

  async function run() {
    const found = current();
    if (!api || !found || busyLayerId) return;
    const { layer, device, rect, drawings } = found;
    const previous = layer.screen!.nodes;
    const mockup = describeMockupElements(device, previous);
    setBusyLayerId(layer.id);
    try {
      const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw');
      const [frame] = convertToExcalidrawElements([
        { type: 'frame', children: [], ...rect }
      ]) as ExcalidrawFrameLikeElement[];
      const elements: ExcalidrawElement[] = withArrowLabelsOnArrows(
        drawings.map((element) => ({ ...element, frameId: null }))
      );
      const capture = await captureRegion({
        api,
        frame,
        screensRoot: screensRef.current,
        elements,
        screenLayerIds: [layer.id]
      });
      const result = await drawIntoLayout({
        device: layer.screen!.device,
        nodes: previous,
        image: capture.image,
        drawings: capture.layout,
        elements: mockup
      });

      const ids = new Set(drawings.map((element) => element.id));
      optionsRef.current.setScreenNodes(layer.id, result.nodes);
      await setDeleted(api, ids, true);
      toast.success(result.summary, {
        duration: UNDO_TOAST_DURATION,
        action: {
          label: 'Undo',
          onClick: () => {
            optionsRef.current.setScreenNodes(layer.id, previous);
            void setDeleted(api, ids, false);
          }
        }
      });
    } catch (error) {
      toast.error((error as Error).message || "Couldn't draw into the layout");
    } finally {
      setBusyLayerId(null);
    }
  }

  const layerId = busyLayerId ?? (available ? (activeLayer?.id ?? null) : null);
  const state: DrawIntoLayoutState | null = layerId
    ? { layerId, busy: busyLayerId !== null }
    : null;

  /** Whether the viewport point is on the Draw into layout button. */
  function buttonAt(x: number, y: number) {
    const rect = screensRef.current
      ?.querySelector('[data-draw-into-layout-button]')
      ?.getBoundingClientRect();
    return Boolean(rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
  }

  return { state, drawnOver, run, buttonAt };
}
