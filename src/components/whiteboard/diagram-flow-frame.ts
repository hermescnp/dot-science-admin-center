import {
  convertToExcalidrawElements,
  getCommonBounds,
  newElementWith
} from '@excalidraw/excalidraw';
import type {
  ExcalidrawElement,
  ExcalidrawFrameElement
} from '@excalidraw/excalidraw/element/types';

const FRAME_PADDING = 40;
const MAX_NAME_LENGTH = 80;
export const DEFAULT_DIAGRAM_FRAME_NAME = 'Diagram flow';
/** Where Excalidraw's Diagram Flow dialog keeps the last Mermaid definition it inserted. */
const MERMAID_STORAGE_KEY = 'mermaid-to-excalidraw';

/** `title:` from the Mermaid frontmatter of the last inserted definition. */
export function mermaidTitle(): string | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(MERMAID_STORAGE_KEY) ?? 'null');
    if (typeof stored !== 'string') return null;
    const frontmatter = /^\s*---\s*\n([\s\S]*?)\n\s*---/.exec(stored)?.[1];
    const title = frontmatter?.match(/^\s*title\s*:\s*(.+)$/m)?.[1];
    return title?.trim().replace(/^(["'])(.*)\1$/, '$2') || null;
  } catch {
    return null;
  }
}

export function diagramFrameName(name: string | null | undefined): string {
  const trimmed = name?.trim().replace(/\s+/g, ' ');
  if (!trimmed) return DEFAULT_DIAGRAM_FRAME_NAME;
  return trimmed.length > MAX_NAME_LENGTH ? `${trimmed.slice(0, MAX_NAME_LENGTH - 1)}…` : trimmed;
}

/** Puts the elements with `ids` into a new frame that hugs them, appended after them. */
export function wrapInFrame(
  elements: readonly ExcalidrawElement[],
  ids: ReadonlySet<string>,
  name: string
): { frame: ExcalidrawFrameElement; elements: ExcalidrawElement[] } {
  const children = elements.filter((element) => ids.has(element.id) && !element.isDeleted);
  const [minX, minY, maxX, maxY] = getCommonBounds(children);
  const [frame] = convertToExcalidrawElements([
    {
      type: 'frame',
      children: [],
      name,
      x: minX - FRAME_PADDING,
      y: minY - FRAME_PADDING,
      width: maxX - minX + FRAME_PADDING * 2,
      height: maxY - minY + FRAME_PADDING * 2
    }
  ]) as [ExcalidrawFrameElement];
  return {
    frame,
    elements: [
      ...elements.map((element) =>
        ids.has(element.id) ? newElementWith(element, { frameId: frame.id }) : element
      ),
      frame
    ]
  };
}
