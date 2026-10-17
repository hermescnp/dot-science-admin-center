import { createContext, use, type KeyboardEvent, type MouseEvent } from 'react';
import {
  NODE_TYPES,
  type NodeLayout,
  type NodeProperties,
  type NodeType,
  type UiNode
} from '../../api/types';

export const NODE_DRAG_MIME = 'application/x-design-node';
/** Hover id for the page itself, since `null` means nothing is hovered. */
export const ROOT_DROP_ID = '__root__';

const COMPONENT_DRAG_PREFIX = 'component:';

export type NodeDrag = { type: NodeType } | { componentId: string };

/** The `NODE_DRAG_MIME` payload for a library element or a reusable component. */
export function nodeDragValue(drag: NodeDrag): string {
  return 'componentId' in drag ? `${COMPONENT_DRAG_PREFIX}${drag.componentId}` : drag.type;
}

export function parseNodeDrag(value: string): NodeDrag | null {
  if (value.startsWith(COMPONENT_DRAG_PREFIX)) {
    return { componentId: value.slice(COMPONENT_DRAG_PREFIX.length) };
  }
  return (NODE_TYPES as readonly string[]).includes(value) ? { type: value as NodeType } : null;
}

export interface WireframeContextValue {
  editable: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  nodes: UiNode[];
  layerTitles: ReadonlyMap<string, string>;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  /** `value` is the raw `NODE_DRAG_MIME` payload; without an `index` it goes last. */
  drop: (parentId: string | null, value: string, index?: number) => void;
  updateProperties: (id: string, properties: Partial<NodeProperties>) => void;
  /** Merges into the node's `properties.layout`; `undefined` values clear a setting. */
  updateLayout: (id: string, layout: Partial<NodeLayout>) => void;
  moveNode: (id: string, parentId: string | null, index: number) => void;
}

const noop = () => {};

export const WireframeContext = createContext<WireframeContextValue>({
  editable: false,
  selectedId: null,
  hoveredId: null,
  nodes: [],
  layerTitles: new Map(),
  select: noop,
  hover: noop,
  drop: noop,
  updateProperties: noop,
  updateLayout: noop,
  moveNode: noop
});

export function useWireframe() {
  return use(WireframeContext);
}

/** Click and Enter/Space handling for a non-button element that acts as one. */
export function pressProps(onPress: (event: MouseEvent | KeyboardEvent) => void) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: onPress,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.target !== event.currentTarget) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      onPress(event);
    }
  } as const;
}
