import type {
  ExcalidrawElement,
  ExcalidrawFrameLikeElement
} from '@excalidraw/excalidraw/element/types';

/** A box as fractions of the frame, from its top-left corner. */
interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Region {
  box: Box;
  kinds: Set<string>;
  texts: string[];
}

/** Strokes this close (as a fraction of the frame) count as touching. */
const TOUCH_MARGIN = 0.01;
/**
 * Touching groups stay apart when their union would be this many times bigger than both together,
 * so a figure standing on a long ground line is not reported as one wide thing.
 */
const MAX_MERGE_GROWTH = 2;
const MAX_REGIONS = 16;

const KIND_NAMES: Partial<Record<ExcalidrawElement['type'], string>> = {
  freedraw: 'freehand drawing',
  rectangle: 'shape',
  diamond: 'shape',
  ellipse: 'shape',
  line: 'line',
  arrow: 'arrow',
  text: 'text',
  image: 'image'
};

function area(box: Box) {
  return Math.max(0, box.right - box.left) * Math.max(0, box.bottom - box.top);
}

function padded(box: Box): Box {
  return {
    left: box.left - TOUCH_MARGIN,
    top: box.top - TOUCH_MARGIN,
    right: box.right + TOUCH_MARGIN,
    bottom: box.bottom + TOUCH_MARGIN
  };
}

function union(a: Box, b: Box): Box {
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom)
  };
}

function belongTogether(a: Box, b: Box) {
  const pa = padded(a);
  const pb = padded(b);
  const touching =
    pa.left < pb.right && pb.left < pa.right && pa.top < pb.bottom && pb.top < pa.bottom;
  return touching && area(union(pa, pb)) <= MAX_MERGE_GROWTH * (area(pa) + area(pb));
}

/** Groups overlapping elements (the strokes of one drawing, a shape and its label). */
function mergeRegions(regions: Region[]): Region[] {
  const merged = [...regions];
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < merged.length && !changed; i += 1) {
      for (let j = i + 1; j < merged.length; j += 1) {
        if (!belongTogether(merged[i].box, merged[j].box)) continue;
        merged[i] = {
          box: union(merged[i].box, merged[j].box),
          kinds: new Set([...merged[i].kinds, ...merged[j].kinds]),
          texts: [...merged[i].texts, ...merged[j].texts]
        };
        merged.splice(j, 1);
        changed = true;
        break;
      }
    }
  }
  return merged;
}

function percent(value: number) {
  return Math.round(Math.min(1, Math.max(0, value)) * 100);
}

function sizeWord(width: number, height: number) {
  const extent = Math.max(width, height);
  if (extent < 10) return 'tiny';
  if (extent < 25) return 'small';
  if (extent < 50) return 'medium';
  return 'large';
}

const COLUMNS = [
  'at the far left',
  'left of centre',
  'in the centre',
  'right of centre',
  'at the far right'
];
const ROWS = [
  'at the top',
  'in the upper part',
  'at mid-height',
  'in the lower part',
  'at the bottom'
];

/** Where the box sits, in words; spans of most of an axis are left out. */
function placeWords(box: Box) {
  const place = (start: number, end: number, words: string[]) =>
    end - start > 0.6 ? null : words[Math.min(4, Math.floor(((start + end) / 2) * 5))];
  return [place(box.left, box.right, COLUMNS), place(box.top, box.bottom, ROWS)]
    .filter(Boolean)
    .join(', ');
}

function regionLine({ box, kinds, texts }: Region) {
  const kind = [...kinds].join(' and ');
  const quoted = texts
    .slice(0, 3)
    .map((text) => `"${text.replace(/\s+/g, ' ').trim().slice(0, 40)}"`)
    .join(', ');
  const width = percent(box.right) - percent(box.left);
  const height = percent(box.bottom) - percent(box.top);
  const place = placeWords(box);
  return (
    `- ${sizeWord(width, height)} ${kind}${quoted ? ` with text ${quoted}` : ''}` +
    `${place ? `, ${place}` : ''}: ` +
    `left ${percent(box.left)}–${percent(box.right)}%, top ${percent(box.top)}–${percent(box.bottom)}% ` +
    `(${width}% of the width, ${height}% of the height)`
  );
}

interface LayoutOptions {
  /** The board elements drawn in the capture. */
  elements: readonly ExcalidrawElement[];
  frame: ExcalidrawFrameLikeElement;
  /** Scene rects of the mockup screens drawn in the capture. */
  screens: { x: number; y: number; width: number; height: number }[];
}

/**
 * Where each thing in the frame sits and how big it is, as percentages of the frame, so the image
 * model can keep positions and scale. Overlapping strokes are reported as one drawing.
 */
export async function describeFrameLayout({
  elements,
  frame,
  screens
}: LayoutOptions): Promise<string> {
  const { elementsOverlappingBBox, getCommonBounds } = await import('@excalidraw/excalidraw');
  const toBox = (x1: number, y1: number, x2: number, y2: number): Box => ({
    left: Math.max(0, (x1 - frame.x) / frame.width),
    top: Math.max(0, (y1 - frame.y) / frame.height),
    right: Math.min(1, (x2 - frame.x) / frame.width),
    bottom: Math.min(1, (y2 - frame.y) / frame.height)
  });

  const overlapping: readonly ExcalidrawElement[] = elementsOverlappingBBox({
    elements,
    bounds: frame,
    type: 'overlap'
  });
  const inFrame = overlapping.filter(
    (element) =>
      element.type !== 'frame' &&
      element.type !== 'magicframe' &&
      (!element.frameId || element.frameId === frame.id)
  );
  const regions = mergeRegions(
    inFrame.map((element) => {
      const [x1, y1, x2, y2] = getCommonBounds([element]);
      return {
        box: toBox(x1, y1, x2, y2),
        kinds: new Set([KIND_NAMES[element.type] ?? 'element']),
        texts: element.type === 'text' && element.text.trim() ? [element.text] : []
      };
    })
  );
  const screenRegions: Region[] = screens.map((screen) => ({
    box: toBox(screen.x, screen.y, screen.x + screen.width, screen.y + screen.height),
    kinds: new Set(['UI mockup screen']),
    texts: []
  }));

  return [...screenRegions, ...regions.toSorted((a, b) => area(b.box) - area(a.box))]
    .filter(({ box }) => box.right > box.left || box.bottom > box.top)
    .slice(0, MAX_REGIONS)
    .map(regionLine)
    .join('\n');
}
