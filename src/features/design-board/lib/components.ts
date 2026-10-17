import type {
  DesignComponent,
  DesignSection,
  NodeLayout,
  NodeProperties,
  ScreenDevice,
  UiNode
} from '../api/types';
import { findNode } from './node-tree';

export type ComponentsById = ReadonlyMap<string, DesignComponent>;

/** Layout keys owned by each instance; everything else comes from the component. */
export const PLACEMENT_KEYS = ['width', 'alignSelf', 'grow', 'anchor', 'fixed'] as const;

/** Violet accent shared by instance headers, tree rows and component cards. */
export function componentTone(alpha = 1): string {
  return `oklch(0.6 0.2 293 / ${alpha})`;
}

const ID_SEPARATOR = '~';

function pickLayout(layout: NodeLayout | undefined, placement: boolean): NodeLayout | undefined {
  if (!layout) return undefined;
  const keys = new Set<string>(PLACEMENT_KEYS);
  const picked = Object.fromEntries(
    Object.entries(layout).filter(
      ([key, value]) => value !== undefined && keys.has(key) === placement
    )
  );
  return Object.keys(picked).length ? picked : undefined;
}

/** Ids stay under the 64-char limit: the instance id's head is enough to keep instances apart. */
function instancePrefix(instanceId: string): string {
  return instanceId.slice(0, 8);
}

function prefixIds(nodes: UiNode[], prefix: string): UiNode[] {
  return nodes.map((node) => ({
    ...node,
    id: `${prefix}${ID_SEPARATOR}${node.id}`,
    children: prefixIds(node.children, prefix)
  }));
}

function stripIds(nodes: UiNode[]): UiNode[] {
  return nodes.map((node) => ({
    ...node,
    id: node.id.slice(node.id.indexOf(ID_SEPARATOR) + 1),
    children: stripIds(node.children)
  }));
}

export function isInstance(node: UiNode): boolean {
  return !!node.properties?.componentId;
}

/** The instance with the component's current content, keeping its own id and placement. */
function resolveInstance(instance: UiNode, component: DesignComponent): UiNode {
  const source = component.node;
  const layout = {
    ...pickLayout(source.properties?.layout, false),
    ...pickLayout(instance.properties?.layout, true)
  };
  return {
    ...source,
    id: instance.id,
    expanded: instance.expanded,
    children: prefixIds(source.children, instancePrefix(instance.id)),
    properties: {
      ...source.properties,
      layout: Object.keys(layout).length ? layout : undefined,
      componentId: component.id
    }
  };
}

/** Instances of deleted components keep their stored snapshot as plain elements. */
export function resolveInstances(nodes: UiNode[], byId: ComponentsById): UiNode[] {
  return nodes.map((node) => {
    const componentId = node.properties?.componentId;
    if (!componentId) return { ...node, children: resolveInstances(node.children, byId) };
    const component = byId.get(componentId);
    if (component) return resolveInstance(node, component);
    const properties: NodeProperties = { ...node.properties };
    delete properties.componentId;
    return { ...node, properties };
  });
}

function hasInstance(nodes: UiNode[]): boolean {
  return nodes.some((node) => isInstance(node) || hasInstance(node.children));
}

export function resolveSection(section: DesignSection, byId: ComponentsById): DesignSection {
  return {
    ...section,
    layers: section.layers.map((layer) =>
      layer.screen && hasInstance(layer.screen.nodes)
        ? {
            ...layer,
            screen: { ...layer.screen, nodes: resolveInstances(layer.screen.nodes, byId) }
          }
        : layer
    )
  };
}

/** The canonical content of a node: no instance link, no placement, ids without prefixes. */
export function toComponentNode(node: UiNode, rootId = node.id): UiNode {
  const properties: NodeProperties = { ...node.properties };
  delete properties.componentId;
  const layout = pickLayout(properties.layout, false);
  if (layout) properties.layout = layout;
  else delete properties.layout;
  return { ...node, id: rootId, children: stripIds(node.children), properties };
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const entries = (value: object) => Object.entries(value).filter(([, item]) => item !== undefined);
  const left = entries(a);
  const right = new Map(entries(b));
  return (
    left.length === right.size &&
    left.every(([key, item]) => right.has(key) && sameValue(item, right.get(key)))
  );
}

/** Components whose content was edited through one of the instances in `nodes`. */
export function syncComponents(nodes: UiNode[], byId: ComponentsById): Map<string, UiNode> {
  const changed = new Map<string, UiNode>();
  const visit = (list: UiNode[]) => {
    for (const node of list) {
      const component = node.properties?.componentId
        ? byId.get(node.properties.componentId)
        : undefined;
      if (!component) {
        visit(node.children);
        continue;
      }
      const content = toComponentNode(
        { ...node, expanded: component.node.expanded },
        component.node.id
      );
      if (!sameValue(content, component.node)) changed.set(component.id, content);
    }
  };
  visit(nodes);
  return changed;
}

export function createInstance(component: DesignComponent): UiNode {
  return resolveInstance(
    {
      id: crypto.randomUUID(),
      label: component.name,
      type: component.node.type,
      children: [],
      expanded: true
    },
    component
  );
}

/** The nearest instance enclosing `id` (excluding the node itself), if any. */
export function enclosingInstance(nodes: UiNode[], id: string): UiNode | null {
  for (const node of nodes) {
    if (node.id === id) return null;
    if (!findNode(node.children, id)) continue;
    return isInstance(node) ? node : enclosingInstance(node.children, id);
  }
  return null;
}

export function isInsideInstance(nodes: UiNode[], id: string): boolean {
  return enclosingInstance(nodes, id) !== null;
}

export function containsInstance(node: UiNode): boolean {
  return hasInstance(node.children);
}

export const NESTED_INSTANCE_ERROR = 'A component can’t be placed inside another component.';

/** Whether an instance can go under `parentId` (null for the page): never inside another one. */
export function acceptsInstance(nodes: UiNode[], parentId: string | null): boolean {
  const parent = parentId ? findNode(nodes, parentId) : null;
  return !parent || (!isInstance(parent) && !isInsideInstance(nodes, parent.id));
}

/** The device of a screen that places the component, if any does. */
export function componentDevice(
  sections: DesignSection[],
  componentId: string
): ScreenDevice | null {
  const places = (nodes: UiNode[]): boolean =>
    nodes.some((node) => node.properties?.componentId === componentId || places(node.children));
  for (const section of sections) {
    for (const layer of section.layers) {
      if (layer.screen && places(layer.screen.nodes)) return layer.screen.device;
    }
  }
  return null;
}

/** How many screens place each component, across every section. */
export function componentUsage(sections: DesignSection[]): Map<string, number> {
  const usage = new Map<string, number>();
  const collect = (nodes: UiNode[], found: Set<string>) => {
    for (const node of nodes) {
      const componentId = node.properties?.componentId;
      if (componentId) found.add(componentId);
      else collect(node.children, found);
    }
  };
  for (const section of sections) {
    for (const layer of section.layers) {
      if (!layer.screen) continue;
      const found = new Set<string>();
      collect(layer.screen.nodes, found);
      for (const componentId of found) usage.set(componentId, (usage.get(componentId) ?? 0) + 1);
    }
  }
  return usage;
}
