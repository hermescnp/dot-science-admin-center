import type { CSSProperties } from 'react';
import type {
  LayoutAlign,
  LayoutAnchor,
  LayoutDirection,
  LayoutGap,
  LayoutJustify,
  NodeLayout,
  UiNode
} from '../api/types';
import type { ScrollPin } from './fixed-layer';
import { layoutWidth } from './node-tree';

export const GAPS: Record<LayoutGap, number> = { none: 0, sm: 6, md: 12, lg: 24 };

export const FLEX_ALIGN: Record<LayoutAlign, CSSProperties['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch'
};

export const FLEX_JUSTIFY: Record<LayoutJustify, CSSProperties['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between'
};

export const TEXT_ALIGN: Partial<Record<LayoutAlign, CSSProperties['textAlign']>> = {
  center: 'center',
  end: 'right'
};

export const ANCHOR_INSET = 12;

export const ANCHORS: Record<LayoutAnchor, CSSProperties> = {
  'top-left': { top: ANCHOR_INSET, left: ANCHOR_INSET },
  top: { top: ANCHOR_INSET, left: '50%', translate: '-50% 0' },
  'top-right': { top: ANCHOR_INSET, right: ANCHOR_INSET },
  left: { top: '50%', left: ANCHOR_INSET, translate: '0 -50%' },
  center: { top: '50%', left: '50%', translate: '-50% -50%' },
  right: { top: '50%', right: ANCHOR_INSET, translate: '0 -50%' },
  'bottom-left': { bottom: ANCHOR_INSET, left: ANCHOR_INSET },
  bottom: { bottom: ANCHOR_INSET, left: '50%', translate: '-50% 0' },
  'bottom-right': { bottom: ANCHOR_INSET, right: ANCHOR_INSET }
};

/** How a container lays out its children. */
export interface Flow {
  direction: LayoutDirection;
  align: LayoutAlign;
}

export const ROOT_FLOW: Flow = { direction: 'column', align: 'stretch' };

export function flowOf(layout: NodeLayout | undefined, direction = layout?.direction): Flow {
  return { direction: direction ?? 'column', align: layout?.align ?? 'stretch' };
}

export function flowStyle(
  layout: NodeLayout | undefined,
  flow: Flow,
  defaultGap: LayoutGap = 'md'
): CSSProperties {
  return {
    display: 'flex',
    flexDirection: flow.direction,
    justifyContent: FLEX_JUSTIFY[layout?.justify ?? 'start'],
    alignItems: FLEX_ALIGN[flow.align],
    gap: GAPS[layout?.gap ?? defaultGap],
    flexWrap: layout?.wrap ? 'wrap' : undefined,
    textAlign: TEXT_ALIGN[flow.align]
  };
}

/** The alignment a child gets in `flow` when it doesn't set `alignSelf`. */
export function defaultSelfAlign(flow: Flow): LayoutAlign {
  return flow.direction === 'column' && flow.align === 'stretch' ? 'start' : flow.align;
}

/** Flow placement shared by scrolling and sticky elements. */
function flowPlacement(node: UiNode, flow: Flow): CSSProperties {
  const layout = node.properties?.layout;
  const width = layoutWidth(node);
  const percent = typeof width === 'number' ? `${width}%` : undefined;
  const style: CSSProperties = { display: 'flex', flexDirection: 'column', minWidth: 0 };
  if (flow.direction === 'column') {
    if (width === 'fill') style.alignSelf = 'stretch';
    else {
      style.width = percent;
      const self = layout?.alignSelf ?? (flow.align === 'stretch' ? 'start' : undefined);
      if (self) style.alignSelf = FLEX_ALIGN[self];
    }
    // A full-width element can't move sideways, so its own alignment shows in its text.
    if (layout?.alignSelf) style.textAlign = TEXT_ALIGN[layout.alignSelf] ?? 'left';
    if (layout?.grow) style.flex = '1 1 0';
  } else {
    style.flex =
      width === 'fill' || layout?.grow ? '1 1 0' : percent ? `0 1 ${percent}` : '0 0 auto';
    // A squeezed cell would spill into its neighbours; the row overflowing instead stays legible.
    style.minWidth = 'min-content';
    if (layout?.alignSelf) style.alignSelf = FLEX_ALIGN[layout.alignSelf];
  }
  return style;
}

/**
 * Where an element sits: screen-fixed (first/last of the page), sticky, anchored over its parent,
 * or in the normal flow.
 */
export function placementStyle(
  node: UiNode,
  flow: Flow,
  pin: ScrollPin | null = null
): CSSProperties {
  const layout = node.properties?.layout;
  const width = layoutWidth(node);
  const percent = typeof width === 'number' ? `${width}%` : undefined;

  if (pin === 'fixed-top' || pin === 'fixed-bottom') {
    const edge = pin === 'fixed-top' ? 'top' : 'bottom';
    // App bars and bottom nav fill the screen flush against its edge.
    if (width === 'fill') {
      return { position: 'absolute', zIndex: 1, insetInline: 0, [edge]: 0 };
    }
    return {
      position: 'absolute',
      zIndex: 1,
      [edge]: 0,
      left: '50%',
      translate: '-50% 0',
      maxWidth: '90%',
      width: percent
    };
  }

  if (pin === 'sticky') {
    return { ...flowPlacement(node, flow), position: 'sticky', top: 0, zIndex: 1 };
  }

  if (layout?.anchor) {
    return {
      position: 'absolute',
      zIndex: 1,
      maxWidth: '90%',
      width: percent,
      ...ANCHORS[layout.anchor]
    };
  }

  return flowPlacement(node, flow);
}

/**
 * Data attributes marking a flow box and the items in it, so drag interactions can read the
 * rendered layout back from the DOM.
 */
export function flowBoxAttributes(flow: Flow) {
  return { 'data-flow-direction': flow.direction, 'data-flow-align': flow.align };
}

export function flowItemAttributes(first: UiNode, last: UiNode = first) {
  return {
    'data-place-first': first.id,
    'data-place-last': last.id,
    'data-anchored': first === last && first.properties?.layout?.anchor ? '' : undefined
  };
}
