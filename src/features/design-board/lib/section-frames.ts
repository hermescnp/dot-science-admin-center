import type {
  ExcalidrawElement,
  ExcalidrawFrameLikeElement
} from '@excalidraw/excalidraw/element/types';
import type { BinaryFiles } from '@excalidraw/excalidraw/types';
import {
  SCREEN_SIZES,
  type DesignLayer,
  type DesignSection,
  type InterfaceScreen
} from '../api/types';
import { screensWithDrawings } from './draw-into-layout';
import { aiRenderOf, withArrowLabelsOnArrows } from './frame-capture';
import { mergeLayers, undimmed } from './layered-elements';

/** The screen's title row above its device outline on the board: `min-h-6` plus `gap-2`. */
export const SCREEN_HEADER_HEIGHT = 32;

interface SceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SectionFrame {
  sectionId: string;
  frameId: string;
  label: string;
}

export interface FrameScene {
  frame: ExcalidrawFrameLikeElement;
  /** Everything drawn on the canvas, as stored; the export clips it to the frame. */
  elements: ExcalidrawElement[];
  files: BinaryFiles;
  /** Layers whose mockup screen shows inside the frame, bottom to top. */
  screenLayers: DesignLayer[];
  /** Empty screens with drawings over them, which show no placeholder (as on the board). */
  drawnOverLayerIds: Set<string>;
}

function isFrame(element: ExcalidrawElement): element is ExcalidrawFrameLikeElement {
  return !element.isDeleted && (element.type === 'frame' || element.type === 'magicframe');
}

/** Every frame on the section's canvas, labelled by its name or its layer and position. */
export function sectionFrames(section: DesignSection): SectionFrame[] {
  const frames: SectionFrame[] = [];
  for (const layer of section.layers) {
    let index = 0;
    for (const element of layer.elements as ExcalidrawElement[]) {
      if (!isFrame(element)) continue;
      index += 1;
      const name = element.name?.trim();
      frames.push({
        sectionId: section.id,
        frameId: element.id,
        label: name || `${section.title} · ${layer.title} · Frame ${index}`
      });
    }
  }
  return frames;
}

function overlaps(a: SceneRect, b: SceneRect) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** The screen's device outline on the canvas, below its title row. */
function deviceRect(screen: InterfaceScreen): SceneRect {
  const size = SCREEN_SIZES[screen.device];
  return {
    x: screen.x,
    y: screen.y + SCREEN_HEADER_HEIGHT,
    width: size.width,
    height: screen.height ?? size.height
  };
}

/**
 * What the frame shows as drawn: the canvas elements (AI renders left out, like a frame capture)
 * and the mockup screens under it.
 */
export function frameScene(section: DesignSection, frameId: string): FrameScene | null {
  const all = undimmed(mergeLayers(section.layers));
  const frame = all.find((element) => element.id === frameId);
  if (!frame || !isFrame(frame)) return null;
  const elements = withArrowLabelsOnArrows(
    all.filter((element) => !element.isDeleted && !aiRenderOf(element))
  );
  const screenLayers = section.layers.filter((layer) => {
    if (!layer.screen) return false;
    const device = deviceRect(layer.screen);
    return overlaps(
      { ...device, y: layer.screen.y, height: device.height + SCREEN_HEADER_HEIGHT },
      frame
    );
  });
  const drawnOverLayerIds = screensWithDrawings(
    elements,
    screenLayers.flatMap((layer) =>
      layer.screen && !layer.screen.nodes.length
        ? [{ layerId: layer.id, rect: deviceRect(layer.screen) }]
        : []
    )
  );
  return {
    frame,
    elements,
    files: section.files as BinaryFiles,
    screenLayers,
    drawnOverLayerIds
  };
}
