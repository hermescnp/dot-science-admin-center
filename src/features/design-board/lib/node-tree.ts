import type { LayoutWidth, NodeProperties, NodeType, UiNode } from '../api/types';

export const NODE_LABELS: Record<NodeType, string> = {
  section: 'Section',
  button: 'Button',
  form: 'Form',
  field: 'Input field',
  text: 'Text',
  'data-display': 'Data display',
  'column-layout': 'Column layout',
  list: 'List',
  'search-bar': 'Search bar',
  'tabs-bar': 'Tabs bar',
  'image-carousel': 'Image / carousel'
};

export const CONTAINER_TYPES: ReadonlySet<NodeType> = new Set([
  'section',
  'form',
  'column-layout',
  'list',
  'tabs-bar'
]);

/** Hue per container type, spread on the wheel so nested kinds stay distinguishable. */
const CONTAINER_HUES: Partial<Record<NodeType, number>> = {
  section: 250,
  form: 295,
  'column-layout': 55,
  list: 165,
  'tabs-bar': 345
};

/** The container type's accent, at an optional alpha; null for leaf elements. */
export function containerTone(type: NodeType, alpha = 1): string | null {
  const hue = CONTAINER_HUES[type];
  return hue === undefined ? null : `oklch(0.7 0.13 ${hue} / ${alpha})`;
}

/** Whether a container draws its boundary in the rendered UI; leaf elements always do. */
export function isContainerVisible(node: UiNode): boolean {
  return node.properties?.visible ?? true;
}

const HUG_TYPES: ReadonlySet<NodeType> = new Set(['button']);

/** Buttons fit their label by default; everything else spans its parent. */
export function layoutWidth(node: UiNode): LayoutWidth {
  return node.properties?.layout?.width ?? (HUG_TYPES.has(node.type) ? 'hug' : 'fill');
}

const DEFAULT_PROPERTIES: Partial<Record<NodeType, NodeProperties>> = {
  'search-bar': { searchBarStyle: 'simple', placeholder: 'Search…', hasSearchButton: true },
  'tabs-bar': { selectedTabIndex: 0 },
  button: { buttonType: 'primary', behavior: 'Performs an action' },
  field: { inputType: 'text', validation: '' },
  text: { textStyle: 'body', content: 'Text content' },
  'data-display': { valueType: 'item-id' },
  'image-carousel': {
    imageDisplayMode: 'single',
    imageAspectRatio: 'landscape',
    imageCount: 3,
    showCaption: false,
    showIndicators: true
  }
};

export function createNode(type: NodeType): UiNode {
  return {
    id: crypto.randomUUID(),
    label: `New ${NODE_LABELS[type].toLowerCase()}`,
    type,
    children: [],
    expanded: true,
    properties: { dependency: 'independent', ...DEFAULT_PROPERTIES[type] }
  };
}

export function findNode(nodes: UiNode[], id: string): UiNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

/** The parent's id, `null` for a root node, or `undefined` when `id` isn't in the tree. */
export function findParentId(
  nodes: UiNode[],
  id: string,
  parentId: string | null = null
): string | null | undefined {
  for (const node of nodes) {
    if (node.id === id) return parentId;
    const found = findParentId(node.children, id, node.id);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function isDescendant(nodes: UiNode[], ancestorId: string, id: string): boolean {
  const ancestor = findNode(nodes, ancestorId);
  return !!ancestor && findNode(ancestor.children, id) !== null;
}

export function flattenNodes(nodes: UiNode[]): UiNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);
}

function mapTree(nodes: UiNode[], fn: (node: UiNode) => UiNode): UiNode[] {
  return nodes.map((node) => fn({ ...node, children: mapTree(node.children, fn) }));
}

export function updateNode(nodes: UiNode[], id: string, updates: Partial<UiNode>): UiNode[] {
  return mapTree(nodes, (node) => (node.id === id ? { ...node, ...updates } : node));
}

export function updateNodeProperties(
  nodes: UiNode[],
  id: string,
  properties: Partial<NodeProperties>
): UiNode[] {
  return mapTree(nodes, (node) =>
    node.id === id ? { ...node, properties: { ...node.properties, ...properties } } : node
  );
}

export function insertNode(
  nodes: UiNode[],
  parentId: string | null,
  node: UiNode,
  index = Infinity
): UiNode[] {
  const insert = (list: UiNode[]) => {
    const next = [...list];
    next.splice(Math.min(index, next.length), 0, node);
    return next;
  };
  if (parentId === null) return insert(nodes);
  return mapTree(nodes, (current) =>
    current.id === parentId
      ? { ...current, expanded: true, children: insert(current.children) }
      : current
  );
}

export function removeNode(nodes: UiNode[], id: string): UiNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeNode(node.children, id) }));
}

export function moveNode(
  nodes: UiNode[],
  id: string,
  targetParentId: string | null,
  index: number
): UiNode[] {
  const node = findNode(nodes, id);
  if (!node || id === targetParentId) return nodes;
  if (targetParentId && isDescendant(nodes, id, targetParentId)) return nodes;
  return insertNode(removeNode(nodes, id), targetParentId, node, index);
}

export function siblingsOf(nodes: UiNode[], id: string): UiNode[] {
  const parentId = findParentId(nodes, id);
  if (parentId === undefined) return [];
  return parentId === null ? nodes : (findNode(nodes, parentId)?.children ?? []);
}
