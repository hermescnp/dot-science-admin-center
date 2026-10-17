import type { DesignLayer, UiNode } from '../api/types';
import { resolveInstances, type ComponentsById } from './components';

/** Keeps the outline well under the render request's limit. */
const MAX_OUTLINE_LENGTH = 12_000;

function clip(text: string, max: number) {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function nodeTraits(node: UiNode): string[] {
  const properties = node.properties ?? {};
  const layout = properties.layout ?? {};
  const traits: (string | number | false | undefined)[] = [
    node.type,
    properties.textStyle,
    properties.buttonType && `${properties.buttonType} button`,
    properties.inputType && `${properties.inputType} input`,
    properties.searchBarStyle,
    properties.tabLabels?.length && `tabs: ${properties.tabLabels.join(', ')}`,
    properties.options?.length && `options: ${properties.options.join(', ')}`,
    properties.itemCount && `${properties.itemCount} items`,
    properties.imageCount && `${properties.imageCount} images`,
    properties.imageAspectRatio,
    layout.direction === 'row' && 'children in a row',
    layout.anchor && `pinned ${layout.anchor}`,
    layout.fixed && 'fixed while scrolling',
    properties.visible === false && 'no visible boundary'
  ];
  return traits.filter((trait): trait is string => typeof trait === 'string' && trait !== '');
}

function nodeLine(node: UiNode, depth: number, components: ComponentsById): string {
  const properties = node.properties ?? {};
  const component = properties.componentId ? components.get(properties.componentId) : undefined;
  const parts = [`${'  '.repeat(depth)}- ${clip(node.label, 120) || node.type}`];
  parts.push(`(${nodeTraits(node).join(', ')})`);
  if (properties.content) parts.push(`text "${clip(properties.content, 200)}"`);
  if (properties.placeholder) parts.push(`placeholder "${clip(properties.placeholder, 80)}"`);
  const description = node.description || component?.description;
  const line = parts.join(' ');
  return description ? `${line}: ${clip(description, 300)}` : line;
}

function nodeLines(nodes: UiNode[], depth: number, components: ComponentsById): string[] {
  return nodes.flatMap((node) => [
    nodeLine(node, depth, components),
    ...nodeLines(node.children, depth + 1, components)
  ]);
}

/**
 * The UI structure of each mockup screen, top to bottom: element, type, key properties and its
 * description, nested like the screen. Empty when no layer has a screen.
 */
export function screenOutline(layers: DesignLayer[], components: ComponentsById): string {
  const outline = layers
    .flatMap(({ title, screen }) => {
      if (!screen) return [];
      const kind = screen.pageStyle === 'panel' ? `${screen.device} panel` : screen.device;
      return [
        [
          `Screen "${clip(title, 120)}" (${kind}):`,
          ...nodeLines(resolveInstances(screen.nodes, components), 0, components)
        ].join('\n')
      ];
    })
    .join('\n\n');
  return outline.length > MAX_OUTLINE_LENGTH
    ? `${outline.slice(0, MAX_OUTLINE_LENGTH - 1)}…`
    : outline;
}
