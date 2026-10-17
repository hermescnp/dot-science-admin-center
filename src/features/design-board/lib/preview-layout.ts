/**
 * Layout editing for component previews. Elements the designer can move get a stable
 * `data-wf-el` id; the first edit "freezes" the preview, turning every tagged element into an
 * absolutely positioned box at the place the flow layout had put it, so later moves never reflow
 * the rest. Horizontal geometry is a share of the parent's width (instances render at different
 * widths), vertical geometry is in pixels. Everything lives in the preview HTML as inline styles,
 * so every instance shows the edits.
 */

export const PREVIEW_ELEMENT_ATTRIBUTE = 'data-wf-el';
const LAYOUT_ATTRIBUTE = 'data-wf-layout';
const HEIGHT_ATTRIBUTE = 'data-wf-height';

/** A box in its parent's padding box, in frame pixels. */
export interface PreviewElementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SKIPPED_TAGS = new Set([
  'style',
  'script',
  'br',
  'wbr',
  'template',
  'source',
  'track',
  'meta',
  'link',
  'noscript',
  'title'
]);
/** Moved as one piece: their insides are never tagged. */
const ATOMIC_TAGS = new Set([
  'img',
  'svg',
  'canvas',
  'video',
  'picture',
  'iframe',
  'hr',
  'input',
  'select',
  'textarea',
  'object'
]);

function parseHtml(html: string) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template;
}

/** The preview's outermost element; the layout lives inside it. */
export function findPreviewRoot(container: ParentNode): HTMLElement | null {
  return (
    (Array.from(container.children).find(
      (child) => !SKIPPED_TAGS.has(child.localName)
    ) as HTMLElement) ?? null
  );
}

function hasOwnText(element: Element) {
  return Array.from(element.childNodes).some(
    (node) => node.nodeType === 3 && node.textContent?.trim()
  );
}

/**
 * Elements that can be moved: every element under the root down to text runs and atomic
 * elements. Containers are included too (moving one carries its children); the inline parts of a
 * text run (a <strong> inside a label) are not.
 */
function collectMovableElements(root: Element) {
  const elements: Element[] = [];
  const visit = (parent: Element) => {
    if (parent !== root && hasOwnText(parent)) return;
    for (const child of Array.from(parent.children)) {
      if (SKIPPED_TAGS.has(child.localName)) continue;
      elements.push(child);
      if (!ATOMIC_TAGS.has(child.localName)) visit(child);
    }
  };
  visit(root);
  return elements;
}

/** Gives every movable element a stable id; the HTML is returned untouched when none was missing. */
export function tagPreviewElements(html: string) {
  if (!html.trim() || typeof document === 'undefined') return html;
  const template = parseHtml(html);
  const root = findPreviewRoot(template.content);
  if (!root) return html;

  const elements = collectMovableElements(root);
  let next = 0;
  for (const element of elements) {
    const match = /^e(\d+)$/.exec(element.getAttribute(PREVIEW_ELEMENT_ATTRIBUTE) ?? '');
    if (match) next = Math.max(next, Number(match[1]));
  }
  let changed = false;
  const seen = new Set<string>();
  for (const element of elements) {
    const id = element.getAttribute(PREVIEW_ELEMENT_ATTRIBUTE);
    if (id && !seen.has(id)) {
      seen.add(id);
      continue;
    }
    next += 1;
    element.setAttribute(PREVIEW_ELEMENT_ATTRIBUTE, `e${next}`);
    seen.add(`e${next}`);
    changed = true;
  }
  return changed ? template.innerHTML : html;
}

export function isPreviewLayoutFrozen(html: string) {
  return html.includes(`${LAYOUT_ATTRIBUTE}="frozen"`);
}

/** Splits an inline style into declarations, keeping `;` inside quotes and parentheses (data URLs). */
function splitDeclarations(style: string) {
  const declarations: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let index = 0; index < style.length; index += 1) {
    const char = style[index];
    if (quote) {
      if (char === quote && style[index - 1] !== '\\') quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    } else if (char === ';' && depth === 0) {
      declarations.push(style.slice(start, index));
      start = index + 1;
    }
  }
  declarations.push(style.slice(start));
  return declarations.map((declaration) => declaration.trim()).filter(Boolean);
}

/** Sets properties on an inline style string, replacing earlier values and keeping the rest verbatim. */
function setInlineStyleProperties(
  style: string | null | undefined,
  properties: Record<string, string>
) {
  const names = new Set(Object.keys(properties));
  const kept = splitDeclarations(style ?? '').filter((declaration) => {
    const colon = declaration.indexOf(':');
    return colon < 0 || !names.has(declaration.slice(0, colon).trim().toLowerCase());
  });
  return [...kept, ...Object.entries(properties).map(([name, value]) => `${name}:${value}`)].join(
    ';'
  );
}

function px(value: number) {
  return `${Math.round(value)}px`;
}

function percent(value: number, of: number) {
  return `${Number(((value / Math.max(of, 1)) * 100).toFixed(3))}%`;
}

/** Inline geometry pinning an element to `rect` in a parent `parentWidth` pixels wide. */
function geometryStyle(
  style: string | null | undefined,
  rect: PreviewElementRect,
  parentWidth: number
) {
  return setInlineStyleProperties(style, {
    position: 'absolute',
    left: percent(rect.x, parentWidth),
    top: px(rect.y),
    width: percent(rect.width, parentWidth),
    height: px(rect.height),
    right: 'auto',
    bottom: 'auto',
    margin: '0',
    'box-sizing': 'border-box',
    'min-width': '0',
    'max-width': 'none',
    'min-height': '0',
    'max-height': 'none'
  });
}

function rootStyle(style: string | null | undefined, height: number) {
  return setInlineStyleProperties(style, {
    position: 'relative',
    height: px(height),
    'box-sizing': 'border-box',
    'min-height': '0',
    'max-height': 'none'
  });
}

function isSafeElementId(id: string) {
  return /^[\w-]+$/.test(id);
}

/** A tagged element's box and the width of the parent its percentages refer to. */
export interface PreviewElementGeometry {
  rect: PreviewElementRect;
  parentWidth: number;
}

/** Pins every measured element at its box, gives the root a fixed height and marks the layout frozen. */
export function freezePreviewLayout(
  html: string,
  geometries: Readonly<Record<string, PreviewElementGeometry>>,
  rootHeight: number
) {
  const template = parseHtml(html);
  const root = findPreviewRoot(template.content);
  if (!root) return html;
  for (const element of Array.from(root.querySelectorAll(`[${PREVIEW_ELEMENT_ATTRIBUTE}]`))) {
    const geometry = geometries[element.getAttribute(PREVIEW_ELEMENT_ATTRIBUTE) ?? ''];
    if (geometry) {
      element.setAttribute(
        'style',
        geometryStyle(element.getAttribute('style'), geometry.rect, geometry.parentWidth)
      );
    }
  }
  root.setAttribute('style', rootStyle(root.getAttribute('style'), rootHeight));
  root.setAttribute(LAYOUT_ATTRIBUTE, 'frozen');
  return template.innerHTML;
}

/** Moves or resizes one element; `rootHeight` keeps the root tall enough to hold it. */
export function applyPreviewElementGeometry(
  html: string,
  id: string,
  geometry: PreviewElementGeometry,
  rootHeight: number
) {
  if (!isSafeElementId(id)) return html;
  const template = parseHtml(html);
  const root = findPreviewRoot(template.content);
  const element = template.content.querySelector(`[${PREVIEW_ELEMENT_ATTRIBUTE}="${id}"]`);
  if (!root || !element) return html;
  element.setAttribute(
    'style',
    geometryStyle(element.getAttribute('style'), geometry.rect, geometry.parentWidth)
  );
  root.setAttribute('style', rootStyle(root.getAttribute('style'), rootHeight));
  return template.innerHTML;
}

/** Gives the root a height chosen by hand; a flow layout spreads into it, a frozen one keeps its places. */
export function setPreviewRootHeight(html: string, height: number) {
  const template = parseHtml(html);
  const root = findPreviewRoot(template.content);
  if (!root) return html;
  root.setAttribute('style', rootStyle(root.getAttribute('style'), height));
  root.setAttribute(HEIGHT_ATTRIBUTE, 'manual');
  return template.innerHTML;
}

export function setRenderedRootHeight(root: HTMLElement, height: number) {
  root.setAttribute('style', rootStyle(root.getAttribute('style'), height));
}

/** Removes one element (with everything inside it). */
export function removePreviewElement(html: string, id: string) {
  if (!isSafeElementId(id)) return html;
  const template = parseHtml(html);
  const element = template.content.querySelector(`[${PREVIEW_ELEMENT_ATTRIBUTE}="${id}"]`);
  if (!element) return html;
  element.remove();
  return template.innerHTML;
}

/** The same freeze applied to the rendered preview, so a drag can start before the HTML is saved. */
export function freezeRenderedPreview(
  root: HTMLElement,
  geometries: Readonly<Record<string, PreviewElementGeometry>>
) {
  const height = root.offsetHeight;
  for (const element of Array.from(
    root.querySelectorAll<HTMLElement>(`[${PREVIEW_ELEMENT_ATTRIBUTE}]`)
  )) {
    const geometry = geometries[element.getAttribute(PREVIEW_ELEMENT_ATTRIBUTE) ?? ''];
    if (geometry) applyRenderedGeometry(element, geometry);
  }
  root.setAttribute('style', rootStyle(root.getAttribute('style'), height));
  root.setAttribute(LAYOUT_ATTRIBUTE, 'frozen');
}

export function applyRenderedGeometry(element: Element, geometry: PreviewElementGeometry) {
  element.setAttribute(
    'style',
    geometryStyle(element.getAttribute('style'), geometry.rect, geometry.parentWidth)
  );
}

/** Grows the rendered root so `element` fits inside it; returns the root's height. */
export function fitRenderedRoot(root: HTMLElement, element: Element) {
  const view = root.ownerDocument.defaultView;
  const style = view?.getComputedStyle(root);
  const bottom =
    element.getBoundingClientRect().bottom -
    root.getBoundingClientRect().top +
    parseFloat(style?.paddingBottom ?? '0') +
    parseFloat(style?.borderBottomWidth ?? '0');
  const height = Math.max(root.offsetHeight, Math.ceil(bottom));
  if (height !== root.offsetHeight) {
    root.setAttribute('style', rootStyle(root.getAttribute('style'), height));
  }
  return height;
}

/**
 * One element's box in its parent's padding box (the containing block once frozen), from the
 * rendered layout. Hidden elements have none.
 */
export function measurePreviewElement(element: Element): PreviewElementGeometry | null {
  const parent = element.parentElement;
  if (!parent) return null;
  const box = element.getBoundingClientRect();
  if (box.width === 0 && box.height === 0) return null;
  const parentBox = parent.getBoundingClientRect();
  return {
    rect: {
      x: box.left - parentBox.left - parent.clientLeft,
      y: box.top - parentBox.top - parent.clientTop,
      // Fractional widths: a box rounded down can wrap its last word onto a new line.
      width: Math.ceil(box.width - 0.01),
      height: Math.ceil(box.height - 0.01)
    },
    parentWidth: parent.clientWidth
  };
}

/** Every tagged element's geometry in the rendered preview. */
export function measurePreviewLayout(root: HTMLElement) {
  const geometries: Record<string, PreviewElementGeometry> = {};
  for (const element of Array.from(root.querySelectorAll(`[${PREVIEW_ELEMENT_ATTRIBUTE}]`))) {
    const id = element.getAttribute(PREVIEW_ELEMENT_ATTRIBUTE);
    const geometry = id ? measurePreviewElement(element) : null;
    if (id && geometry) geometries[id] = geometry;
  }
  return geometries;
}
