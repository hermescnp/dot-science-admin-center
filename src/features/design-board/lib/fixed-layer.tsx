import {
  createContext,
  use,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject
} from 'react';
import { createPortal } from 'react-dom';
import type { UiNode } from '../api/types';
import { useAnchorClearance } from './use-anchor-clearance';

/** How a `layout.fixed` element sticks, based on its place among the page's root children. */
export type ScrollPin = 'fixed-top' | 'fixed-bottom' | 'sticky';

/** The layer laid over a screen's scrolling area, holding elements fixed to the screen. */
export const FixedLayerContext = createContext<HTMLElement | null>(null);

/** The screen's root nodes; used to decide first → top, last → bottom, else sticky. */
export const PageNodesContext = createContext<readonly UiNode[]>([]);

/**
 * First root element pins to the top, last to the bottom; anything else (including nested
 * elements) sticks to the top while the page scrolls.
 */
export function scrollPinOf(node: UiNode, pageNodes: readonly UiNode[]): ScrollPin | null {
  if (!node.properties?.layout?.fixed) return null;
  const index = pageNodes.findIndex((current) => current.id === node.id);
  if (index === 0) return 'fixed-top';
  if (index >= 0 && index === pageNodes.length - 1) return 'fixed-bottom';
  return 'sticky';
}

export function isScreenFixed(pin: ScrollPin | null): boolean {
  return pin === 'fixed-top' || pin === 'fixed-bottom';
}

/** True when the node is pinned to the screen (first or last of the page with fixed on). */
export function isFixed(node: UiNode, pageNodes: readonly UiNode[] = []): boolean {
  return isScreenFixed(scrollPinOf(node, pageNodes));
}

/** Moves a screen-fixed element into the fixed layer so it stays put while the page scrolls. */
export function FixedPortal({ node, children }: { node: UiNode; children: ReactNode }) {
  const layer = use(FixedLayerContext);
  const pageNodes = use(PageNodesContext);
  return isFixed(node, pageNodes) && layer ? createPortal(children, layer) : children;
}

/**
 * The fixed layer for a screen whose content scrolls in `scrollRef`. The scrolling area is padded
 * by the fixed elements, so the start and end of the page can still be scrolled out from under them.
 */
export function useFixedLayer(scrollRef: RefObject<HTMLElement | null>, nodes: UiNode[]) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => setLayer(layerRef.current), []);
  // Portals only mount once the layer is known, so the clearance waits for it too.
  useAnchorClearance(layerRef, layer ? nodes : null, scrollRef);
  return { layerRef, layer };
}
