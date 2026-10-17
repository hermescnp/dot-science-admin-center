import type {
  ExcalidrawElement,
  ExcalidrawFrameLikeElement
} from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { previewHtmlOf } from '../components/interface/component-preview-frame';
import { componentSvg } from './component-svg';
import { describeFrameLayout } from './frame-layout';
import { undimmed } from './layered-elements';

/** Long side of the screenshot sent to the image model. */
const CAPTURE_SIZE = 1536;
/** Small frames are upscaled at most this much. */
const MAX_CAPTURE_SCALE = 4;
/** Long side of the render stored on the board. */
const RENDER_SIZE = 1600;
const RENDER_QUALITY = 0.86;

export interface AiRenderData {
  prompt: string;
}

/** The prompt of an AI render image, or null for any other element. */
export function aiRenderOf(element: ExcalidrawElement): AiRenderData | null {
  const data = element.customData?.aiRender as AiRenderData | undefined;
  return data && typeof data.prompt === 'string' ? data : null;
}

/** The last render placed in `frame`, if any. */
export function lastAiRender(
  elements: readonly ExcalidrawElement[],
  frameId: string
): AiRenderData | null {
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index];
    const data = element.frameId === frameId ? aiRenderOf(element) : null;
    if (data) return data;
  }
  return null;
}

interface CaptureOptions {
  api: ExcalidrawImperativeAPI;
  frame: ExcalidrawFrameLikeElement;
  /** The mockup screens' layer under the board. */
  screensRoot: HTMLElement | null;
}

interface RegionCaptureOptions extends CaptureOptions {
  /** The board elements to draw; those outside the frame are left out. */
  elements: readonly ExcalidrawElement[];
  /** Only these layers' screens are drawn; every screen under the frame when absent. */
  screenLayerIds?: readonly string[];
}

export interface FrameCapture {
  /** PNG data URL. */
  image: string;
  /** Layers whose mockup screen is in the capture. */
  screenLayerIds: string[];
  /** Position and size of each thing in the frame, as percentages of it. */
  layout: string;
}

interface SceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CapturedScreen {
  layerId: string;
  rect: SceneRect;
}

function overlaps(a: SceneRect, b: SceneRect) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load the image'));
    image.src = src;
  });
}

/**
 * The mockup screens (and the previews in them) under the frame, drawn at `scale` onto
 * `context`, whose origin is the frame's top-left corner.
 */
async function drawScreens(
  context: CanvasRenderingContext2D,
  root: HTMLElement,
  frame: SceneRect,
  scale: number,
  toScene: (rect: DOMRect) => SceneRect,
  layerIds?: readonly string[]
): Promise<CapturedScreen[]> {
  const nodes = [...root.querySelectorAll<HTMLElement>('.react-flow__node')];
  const screens = nodes.flatMap((node) => {
    const view = node.firstElementChild;
    const layerId = node.dataset.id;
    if (!(view instanceof HTMLElement) || !layerId) return [];
    if (layerIds && !layerIds.includes(layerId)) return [];
    const rect = toScene(view.getBoundingClientRect());
    return overlaps(rect, frame) ? [{ layerId, view, rect }] : [];
  });
  if (screens.length === 0) return [];

  const { domToCanvas } = await import('modern-screenshot');
  for (const { view, rect } of screens) {
    const canvas = await domToCanvas(view, {
      width: view.offsetWidth,
      height: view.offsetHeight,
      scale,
      style: { opacity: '1' },
      onCloneEachNode: (cloned) => {
        // Previews are drawn separately below: same-origin frames would otherwise be inlined,
        // and sandboxed ones come out blank.
        if (cloned instanceof HTMLHtmlElement) cloned.replaceChildren();
        if (cloned instanceof HTMLIFrameElement) cloned.removeAttribute('srcdoc');
        if (cloned instanceof HTMLElement && cloned.hasAttribute('data-screen-header')) {
          cloned.style.visibility = 'hidden';
        }
      }
    });
    context.drawImage(
      canvas,
      (rect.x - frame.x) * scale,
      (rect.y - frame.y) * scale,
      rect.width * scale,
      rect.height * scale
    );

    for (const iframe of view.querySelectorAll('iframe')) {
      const html = previewHtmlOf(iframe);
      if (!html || iframe.offsetWidth === 0 || iframe.offsetHeight === 0) continue;
      const box = toScene(iframe.getBoundingClientRect());
      const svg = await componentSvg(html, iframe.offsetWidth);
      const image = await loadImage(svg.dataURL);
      const height = Math.min(svg.height, iframe.offsetHeight);
      context.drawImage(
        image,
        0,
        0,
        svg.width,
        height,
        (box.x - frame.x) * scale,
        (box.y - frame.y) * scale,
        box.width * scale,
        (box.width * scale * height) / svg.width
      );
    }
  }
  return screens.map(({ layerId, rect }) => ({ layerId, rect }));
}

/**
 * Arrow labels are drawn at their arrow's midpoint, but their stored position goes stale once
 * the arrow moves, and the frame export picks its elements by stored position. Centring the
 * labels on their arrows keeps them in the export; the drawn position is unchanged.
 */
export function withArrowLabelsOnArrows(elements: ExcalidrawElement[]): ExcalidrawElement[] {
  const arrows = new Map(
    elements.flatMap((element) => (element.type === 'arrow' ? [[element.id, element]] : []))
  );
  return elements.map((element) => {
    const arrow =
      element.type === 'text' && element.containerId ? arrows.get(element.containerId) : undefined;
    if (!arrow) return element;
    const xs = arrow.points.map(([x]) => x);
    const ys = arrow.points.map(([, y]) => y);
    return {
      ...element,
      x: arrow.x + (Math.min(...xs) + Math.max(...xs) - element.width) / 2,
      y: arrow.y + (Math.min(...ys) + Math.max(...ys) - element.height) / 2
    };
  });
}

/**
 * A PNG of everything visible inside the frame: the mockup screens under it, then the board
 * elements it overlaps (clipped to it). Earlier AI renders of this frame are left out, so a
 * re-render starts from the sketch.
 */
export function captureFrame({ api, frame, screensRoot }: CaptureOptions): Promise<FrameCapture> {
  const elements = withArrowLabelsOnArrows(
    undimmed(api.getSceneElements()).filter(
      (element) => !(element.frameId === frame.id && aiRenderOf(element))
    )
  );
  return captureRegion({ api, frame, screensRoot, elements });
}

/**
 * A PNG of the frame's region: the chosen mockup screens under it, then the given board elements
 * (clipped to it). The frame may be a stand-in that isn't on the board.
 */
export async function captureRegion({
  api,
  frame,
  screensRoot,
  elements,
  screenLayerIds
}: RegionCaptureOptions): Promise<FrameCapture> {
  const { exportToCanvas } = await import('@excalidraw/excalidraw');
  const { scrollX, scrollY, zoom, offsetLeft, offsetTop } = api.getAppState();
  const scale = Math.min(MAX_CAPTURE_SCALE, CAPTURE_SIZE / Math.max(frame.width, frame.height));
  const width = Math.round(frame.width * scale);
  const height = Math.round(frame.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);

  const toScene = (rect: DOMRect): SceneRect => ({
    x: (rect.left - offsetLeft) / zoom.value - scrollX,
    y: (rect.top - offsetTop) / zoom.value - scrollY,
    width: rect.width / zoom.value,
    height: rect.height / zoom.value
  });
  const screens = screensRoot
    ? await drawScreens(context, screensRoot, frame, scale, toScene, screenLayerIds)
    : [];

  const [board, layout] = await Promise.all([
    exportToCanvas({
      elements,
      files: api.getFiles(),
      exportingFrame: frame,
      appState: { exportBackground: false, exportWithDarkMode: false },
      getDimensions: () => ({ width, height, scale })
    }),
    describeFrameLayout({ elements, frame, screens: screens.map((screen) => screen.rect) })
  ]);
  context.drawImage(board, 0, 0, width, height);
  return {
    image: canvas.toDataURL('image/png'),
    screenLayerIds: screens.map((screen) => screen.layerId),
    layout
  };
}

export interface FittedRender {
  dataURL: string;
  mimeType: 'image/webp' | 'image/png';
}

/** Cover-crops the model's image to the frame's aspect and re-encodes it compactly. */
export async function fitRenderToFrame(
  dataUrl: string,
  frame: Pick<SceneRect, 'width' | 'height'>
): Promise<FittedRender> {
  const image = await loadImage(dataUrl);
  const aspect = frame.width / frame.height;
  const sourceAspect = image.naturalWidth / image.naturalHeight;
  const sourceWidth = sourceAspect > aspect ? image.naturalHeight * aspect : image.naturalWidth;
  const sourceHeight = sourceAspect > aspect ? image.naturalHeight : image.naturalWidth / aspect;
  const longSide = Math.min(RENDER_SIZE, Math.max(sourceWidth, sourceHeight));
  const width = Math.round(aspect >= 1 ? longSide : longSide * aspect);
  const height = Math.round(aspect >= 1 ? longSide / aspect : longSide);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.drawImage(
    image,
    (image.naturalWidth - sourceWidth) / 2,
    (image.naturalHeight - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height
  );
  const dataURL = canvas.toDataURL('image/webp', RENDER_QUALITY);
  return dataURL.startsWith('data:image/webp')
    ? { dataURL, mimeType: 'image/webp' }
    : { dataURL: canvas.toDataURL('image/png'), mimeType: 'image/png' };
}
