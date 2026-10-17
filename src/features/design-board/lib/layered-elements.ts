import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { DesignLayer } from '../api/types';

type Element = ExcalidrawElement;

const DIMMED_OPACITY_FACTOR = 0.3;

/** `CaptureUpdateAction.NEVER`; importing the constant would pull window-only Excalidraw into SSR. */
export const SKIP_HISTORY = 'NEVER' as const;

interface DimmedOriginal {
  locked: boolean;
  opacity: number;
}

export function layerOf(element: Element): string | undefined {
  const id = element.customData?.layerId;
  return typeof id === 'string' ? id : undefined;
}

function withLayer(element: Element, layerId: string): Element {
  return { ...element, customData: { ...element.customData, layerId } };
}

function restore(element: Element): Element {
  const dimmed = element.customData?.dimmed as DimmedOriginal | undefined;
  if (!dimmed) return element;
  const { dimmed: _removed, ...customData } = element.customData ?? {};
  return { ...element, locked: dimmed.locked, opacity: dimmed.opacity, customData };
}

function dim(element: Element): Element {
  if (element.customData?.dimmed) return element;
  const original: DimmedOriginal = { locked: element.locked, opacity: element.opacity };
  return {
    ...element,
    locked: true,
    opacity: Math.round(element.opacity * DIMMED_OPACITY_FACTOR),
    customData: { ...element.customData, dimmed: original }
  };
}

/** Every layer's stored elements on one canvas, each tagged with the layer that owns it. */
export function mergeLayers(layers: DesignLayer[]): Element[] {
  return layers.flatMap((layer) =>
    (layer.elements as Element[]).map((element) => withLayer(element, layer.id))
  );
}

/** Elements drawn since the last layer switch carry no tag yet; they belong to `layerId`. */
export function tagUntagged(elements: readonly Element[], layerId: string | null): Element[] {
  if (layerId === null) return [...elements];
  return elements.map((element) => (layerOf(element) ? element : withLayer(element, layerId)));
}

/**
 * Locks and fades every element outside the active layer; the active layer stays editable.
 * With no active layer (the whole section selected) nothing is faded.
 */
export function toDisplay(elements: readonly Element[], activeLayerId: string | null): Element[] {
  return elements.map((element) => {
    const owner = layerOf(element);
    return activeLayerId === null || !owner || owner === activeLayerId
      ? restore(element)
      : dim(element);
  });
}

/** Every element at its stored appearance, for output where no layer should look faded. */
export function undimmed(elements: readonly Element[]): Element[] {
  return elements.map(restore);
}

/**
 * Splits the canvas back into per-layer element lists, undoing the display-only dimming.
 * Untagged elements (drawn since the last layer switch) go to `drawingLayerId`.
 */
export function groupByLayer(
  elements: readonly Element[],
  layerIds: readonly string[],
  drawingLayerId: string | null
): Record<string, Element[]> {
  const groups: Record<string, Element[]> = Object.fromEntries(layerIds.map((id) => [id, []]));
  for (const element of elements) {
    if (element.isDeleted) continue;
    const owner = layerOf(element) ?? drawingLayerId;
    if (!owner) continue;
    groups[owner]?.push(withLayer(restore(element), owner));
  }
  return groups;
}
