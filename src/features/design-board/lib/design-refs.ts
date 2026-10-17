/**
 * Live references to design work, stored as image sources in Markdown (e.g. knowledge layers):
 * `design:component/<id>` and `design:frame/<sectionId>/<frameId>`.
 */
const PREFIX = 'design:';

export type DesignRef =
  | { kind: 'component'; componentId: string }
  | { kind: 'frame'; sectionId: string; frameId: string };

const SEGMENT = '[A-Za-z0-9_-]+';
const COMPONENT_REF = new RegExp(`^${PREFIX}component/(${SEGMENT})$`);
const FRAME_REF = new RegExp(`^${PREFIX}frame/(${SEGMENT})/(${SEGMENT})$`);

export function componentRef(componentId: string): string {
  return `${PREFIX}component/${componentId}`;
}

export function frameRef(sectionId: string, frameId: string): string {
  return `${PREFIX}frame/${sectionId}/${frameId}`;
}

export function isDesignRef(src: string | null | undefined): boolean {
  return Boolean(src?.startsWith(PREFIX));
}

/** The reference in `src`, or null when it isn't a well-formed one. */
export function parseDesignRef(src: string | null | undefined): DesignRef | null {
  if (!src) return null;
  const component = COMPONENT_REF.exec(src);
  if (component) return { kind: 'component', componentId: component[1] };
  const frame = FRAME_REF.exec(src);
  if (frame) return { kind: 'frame', sectionId: frame[1], frameId: frame[2] };
  return null;
}
