import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ComponentPart, DesignComponent, UiNode, UpdateComponentPayload } from '../api/types';
import { COMPONENT_WIREFRAME_CSS } from '../lib/component-wireframe-css';
import { requestPreview, savePreviewRun } from './design-components';
import {
  DEFAULT_DESIGN_MODEL,
  NODE_PROPERTY_GUIDE,
  requestJson,
  type ChatMessage
} from './openrouter';

interface PreviewModelResult {
  description: string;
  parts: ComponentPart[];
  html: string;
}

function serializeNode(node: UiNode, depth = 0): string {
  const pad = '  '.repeat(depth);
  const layout = node.properties?.layout ? ` layout=${JSON.stringify(node.properties.layout)}` : '';
  const props = node.properties
    ? Object.entries(node.properties)
        .filter(([key]) => key !== 'layout' && key !== 'componentId')
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ')
    : '';
  const description = node.description?.replace(/\s+/g, ' ').trim().slice(0, 400);
  const head = `${pad}- [${node.id}] ${node.type} "${node.label}"${layout}${props ? ` ${props}` : ''}${description ? ` — ${description}` : ''}`;
  if (!node.children.length) return head;
  return [head, ...node.children.map((child) => serializeNode(child, depth + 1))].join('\n');
}

function collectIds(node: UiNode, into = new Set<string>()): Set<string> {
  into.add(node.id);
  for (const child of node.children) collectIds(child, into);
  return into;
}

function parseParts(value: unknown, allowedIds: Set<string>): ComponentPart[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== 'string' ||
      !allowedIds.has(row.id) ||
      typeof row.label !== 'string' ||
      typeof row.summary !== 'string'
    ) {
      return [];
    }
    return [
      {
        id: row.id,
        label: row.label.trim().slice(0, 200) || 'Part',
        summary: row.summary.trim().slice(0, 1000)
      }
    ];
  });
}

function extractPreview(
  row: Record<string, unknown> | null,
  node: UiNode
): PreviewModelResult | null {
  if (!row) return null;
  const html =
    typeof row.html === 'string'
      ? row.html
      : typeof row.code === 'string'
        ? row.code
        : typeof row.preview === 'string'
          ? row.preview
          : '';
  const description = typeof row.description === 'string' ? row.description.trim() : '';
  if (!html.includes('<') || !description) return null;
  return {
    description: description.slice(0, 4000),
    parts: parseParts(row.parts, collectIds(node)),
    html: html.replace(/<!doctype[^>]*>/gi, '').trim()
  };
}

/** Set on the preview's root once a designer has moved or resized its elements by hand. */
const FROZEN_LAYOUT_MARKER = 'data-wf-layout="frozen"';
/** Set on the preview's root when a designer has set its height by hand. */
const MANUAL_HEIGHT_MARKER = 'data-wf-height="manual"';
const PREVIOUS_HTML_LIMIT = 8000;
const FROZEN_HTML_LIMIT = 40_000;

function previousPreview(html: string, frozen: boolean): string {
  if (!html) return '';
  if (!frozen) {
    const keepHeight = html.includes(MANUAL_HEIGHT_MARKER)
      ? `\nA designer set the root's height by hand: keep the root's ${MANUAL_HEIGHT_MARKER} and its inline height unchanged, even where the content overflows it.`
      : '';
    return `\nPrevious preview HTML (reference only — the structure above wins wherever they differ):${keepHeight}\n${html.slice(0, PREVIOUS_HTML_LIMIT)}`;
  }
  return [
    '',
    'Previous preview HTML. A designer arranged its layout by hand: keep it.',
    `- Keep the root's ${FROZEN_LAYOUT_MARKER} and its inline height, and every element's data-wf-el attribute with its inline position, left, top, width and height, unchanged.`,
    '- Change only what the structure edit requires; give new elements a position near related ones in the same style (absolute, left/width in %, top/height in px), and grow the root height if they need room.',
    '- This hand-made layout overrides the sizing rule above for this preview.',
    html.slice(0, FROZEN_HTML_LIMIT)
  ].join('\n');
}

function buildMessages(component: DesignComponent, change?: string): ChatMessage[] {
  const tree = serializeNode(component.node);
  const previous = component.previewHtml?.trim() ?? '';
  return [
    {
      role: 'system',
      content: [
        'You refine UI design-board components into interactive wireframe previews.',
        'Keep a hand-drawn wireframe look: hairline borders, muted fills, simple geometry — not a polished product UI.',
        'Use the provided CSS utility classes (.wf-box, .wf-row, .wf-col, .wf-btn, .wf-nav-item, .wf-collapse with <details>/<summary>, .wf-field, .wf-label, .wf-muted, .wf-icon, .wf-chip). Do not redefine a full design system.',
        'The host injects shared CSS; your HTML is the body fragment only (no <html>/<head>).',
        'Add light interactivity where it helps: expand/collapse groups, tab or nav selection, toggles. No network calls, no external assets, no frameworks.',
        'The structure tree is authoritative: render every node with its current type, label and properties. When a previous preview is given, reuse its interactions and look, but redraw any element whose structure no longer matches.',
        'Text after "—" on a node is its description and part of the spec: draw the icons, badges, counts, sizes, states and copy it names.',
        'Size: the host frame grows to the full height of your content and never crops it, whatever screen the component sits in. Draw the component at its natural height: no fixed, max or viewport heights (no vh units, no height:100%) and no inner scroll areas on the component or its lists.',
        'Lists: draw every item a static list holds; draw a dynamic list with its itemCount items, or 4–6 realistic items when unset, each one complete. Show more items only through the list itself (a "Load more" row when hasMoreIndicator is set), never by scrolling.',
        NODE_PROPERTY_GUIDE,
        'Also write a clear product description of the component as a reusable unit, and a short summary for each internal part (use the exact node ids from the tree).',
        'Respond with ONLY a JSON object: {"description":"...","parts":[{"id":"...","label":"...","summary":"..."}],"html":"<div>...</div>"}.'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `Component name: ${component.name}`,
        '',
        'Editable structure (source of truth):',
        tree,
        '',
        change
          ? `The structure was just edited, after the previous preview was made. This change must be clearly visible in the new preview:\n${change}\n`
          : '',
        'Shared CSS the host will inject (use these classes):',
        '```css',
        COMPONENT_WIREFRAME_CSS.slice(0, 3500),
        '```',
        previousPreview(previous, previous.includes(FROZEN_LAYOUT_MARKER))
      ]
        .filter(Boolean)
        .join('\n')
    }
  ];
}

/**
 * Asks OpenRouter for an interactive wireframe preview + description/parts, then saves them
 * on the component, replacing the previous preview. Sets preview_status to ready or error.
 * When a newer run was requested meanwhile, this run's result is dropped in favour of it.
 * `change` describes a structure edit the new preview has to show (e.g. a vibe edit).
 */
export async function refineComponentPreview(
  supabase: SupabaseClient<Database>,
  id: string,
  userId: string,
  change?: string
): Promise<DesignComponent> {
  const run = await requestPreview(supabase, id, userId);
  if (!run) throw new Error('Component not found');
  const { component, requestedAt } = run;

  async function save(payload: UpdateComponentPayload) {
    const saved = await savePreviewRun(supabase, id, requestedAt, payload, userId);
    if (!saved) throw new Error('Component not found');
    return saved;
  }

  try {
    const answer = await requestJson({
      model: process.env.DESIGN_COMPONENT_PREVIEW_MODEL?.trim() || DEFAULT_DESIGN_MODEL,
      messages: buildMessages(component, change),
      // A hand-arranged preview comes back whole, with every element's inline geometry.
      maxTokens: component.previewHtml?.includes(FROZEN_LAYOUT_MARKER) ? 32000 : 16000
    });
    const result = extractPreview(answer, component.node);
    if (!result) throw new Error('The model did not return a usable preview');

    return await save({
      description: result.description,
      parts: result.parts,
      previewHtml: result.html,
      previewStatus: 'ready',
      previewError: null
    });
  } catch (error) {
    const message = (error as Error).message || 'Preview generation failed';
    return save({ previewStatus: 'error', previewError: message.slice(0, 2000) });
  }
}
