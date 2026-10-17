import { useLayoutEffect, type RefObject } from 'react';

/** Space kept between a pinned element and the flow content or pins next to it. */
const CLEARANCE_GAP = 8;

type Edge = 'top' | 'bottom' | 'left' | 'right';

const PADDING = {
  top: 'paddingTop',
  bottom: 'paddingBottom',
  left: 'paddingLeft',
  right: 'paddingRight'
} as const;

/** The edge a pinned element sits against; centred pins sit over the content on purpose. */
function edgeOf(element: HTMLElement): Edge | null {
  const { style } = element;
  if (style.position !== 'absolute') return null;
  if (style.bottom !== '') return 'bottom';
  if (style.top !== '' && !style.top.endsWith('%')) return 'top';
  if (style.left !== '' && !style.left.endsWith('%')) return 'left';
  if (style.right !== '') return 'right';
  return null;
}

function overlapsSideways(a: DOMRect, b: DOMRect) {
  return a.left < b.right && b.left < a.right;
}

/**
 * Pads a flow box on the edges its pinned children sit on, by their size, so the box's own
 * content never runs underneath them. Pins sharing the top or bottom edge stack away from it
 * instead of covering each other. `deps` should change when the children do.
 *
 * `padRef` pads another element instead, for pins laid over a box rather than inside it.
 */
export function useAnchorClearance(
  ref: RefObject<HTMLElement | null>,
  deps: unknown,
  padRef: RefObject<HTMLElement | null> = ref
) {
  useLayoutEffect(() => {
    const box = ref.current;
    const padded = padRef.current;
    if (!box || !padded) return;
    const pinned = [...box.children].flatMap((element) => {
      const edge = element instanceof HTMLElement ? edgeOf(element) : null;
      return edge && element instanceof HTMLElement
        ? [{ element, edge, inset: element.style[edge], placed: '' }]
        : [];
    });
    if (!pinned.length) return;

    const computed = getComputedStyle(padded);
    const edges = [...new Set(pinned.map(({ edge }) => edge))];
    const base = Object.fromEntries(
      edges.map((edge) => [edge, parseFloat(computed[PADDING[edge]])])
    ) as Record<Edge, number>;
    function apply() {
      const reach: Partial<Record<Edge, number>> = {};
      const stacked: { edge: Edge; rect: DOMRect; end: number }[] = [];
      for (const pin of pinned) {
        const { element, edge } = pin;
        let size = element.offsetWidth;
        let offset = parseFloat(pin.inset) || 0;
        if (edge === 'top' || edge === 'bottom') {
          size = element.offsetHeight;
          const rect = element.getBoundingClientRect();
          for (const other of stacked) {
            if (other.edge === edge && overlapsSideways(rect, other.rect)) {
              offset = Math.max(offset, other.end + CLEARANCE_GAP);
            }
          }
          pin.placed = `${offset}px`;
          element.style[edge] = pin.placed;
          stacked.push({ edge, rect, end: offset + size });
        }
        reach[edge] = Math.max(reach[edge] ?? 0, offset + size + CLEARANCE_GAP);
      }
      for (const edge of edges) {
        padded!.style[PADDING[edge]] = reach[edge]! > base[edge] ? `${reach[edge]}px` : '';
      }
    }

    apply();
    const observer = new ResizeObserver(apply);
    for (const { element } of pinned) observer.observe(element);
    return () => {
      observer.disconnect();
      for (const edge of edges) padded.style[PADDING[edge]] = '';
      // React may have re-placed a pin in this commit; only undo what this effect set.
      for (const { element, edge, inset, placed } of pinned) {
        if (placed && element.style[edge] === placed) element.style[edge] = inset;
      }
    };
  }, [ref, deps, padRef]);
}
