import 'server-only';

import { NODE_TYPES } from '../api/types';
import { CONTAINER_TYPES } from '../lib/node-tree';

const PROPERTIES_REFERENCE = [
  'Properties (all optional) form one flat object on the node, e.g. "properties":{"buttonType":"primary","layout":{"width":"fill"}}; the groups below only say which node types use each key, they are not nested objects.',
  '- layout: { direction: column|row, justify: start|center|end|between, align: start|center|end|stretch, gap: none|sm|md|lg, wrap: boolean, itemDirection: column|row (lists), width: fill|hug|<percent number>, alignSelf, grow: boolean, anchor: top-left|top|top-right|left|center|right|bottom-left|bottom|bottom-right, fixed: boolean }',
  '- button: buttonType primary|basic|tertiary|link|image|toggle|floating-action, behavior',
  '- text: textStyle title|body, content',
  '- field: inputType text|password|number|date|time|select|checkbox|radio|file|slider, placeholder, options: string[], validation',
  '- data-display: valueType item-id|item-description|amount|state|date|quantity, dependency independent|dependent',
  '- list: itemCount, hasMoreIndicator, isDynamicList',
  '- search-bar: searchBarStyle simple|with-filter|with-voice, placeholder, hasSearchButton',
  '- tabs-bar: tabsCount, tabLabels: string[], selectedTabIndex',
  '- image-carousel: imageDisplayMode single|carousel, imageCount, imageAspectRatio square|landscape|portrait|wide, showCaption, showIndicators',
  '- containers: visible (false = grouping without a drawn border)'
].join('\n');

/** How a structure tree is shaped, for the prompts that ask a model to write one. */
export const NODE_TREE_REFERENCE = [
  'A node is {"id","label","description"?,"type","children","properties"?,"expanded"?}.',
  `Node types: ${NODE_TYPES.join(', ')}. Only containers (${[...CONTAINER_TYPES].join(', ')}) have children; every other node has "children": [].`,
  PROPERTIES_REFERENCE
].join('\n');

/**
 * Fills the fields the schema requires but models tend to drop (ids, labels, empty children) and
 * drops optional ones they fill with null or overlong text.
 */
export function normalizeRaw(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const { description, properties, expanded, ...row } = value as Record<string, unknown>;
  return {
    ...row,
    id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : crypto.randomUUID(),
    label: typeof row.label === 'string' ? row.label.slice(0, 200) : '',
    ...(typeof description === 'string' ? { description: description.slice(0, 1000) } : null),
    ...(properties && typeof properties === 'object' && !Array.isArray(properties)
      ? { properties }
      : null),
    ...(typeof expanded === 'boolean' ? { expanded } : null),
    children: Array.isArray(row.children) ? row.children.map(normalizeRaw) : []
  };
}
