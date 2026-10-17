import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { uiNodeSchema, type DesignComponent, type UiNode, type VibeEditResult } from '../api/types';
import { toComponentNode } from '../lib/components';
import { CONTAINER_TYPES } from '../lib/node-tree';
import { getDesignComponent, updateComponent } from './design-components';
import {
  DEFAULT_DESIGN_MODEL,
  NODE_PROPERTY_GUIDE,
  requestJson,
  type ChatMessage
} from './openrouter';
import { NODE_TREE_REFERENCE, normalizeRaw } from './ui-node-output';

/** Instances prefix child ids with 9 characters and ids are capped at 64. */
const MAX_CHILD_ID_LENGTH = 55;

function buildMessages(component: DesignComponent, prompt: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You edit the structure tree of a reusable UI component on a wireframe design board.',
        NODE_TREE_REFERENCE,
        NODE_PROPERTY_GUIDE,
        'Apply only the change the user asks for and leave everything else exactly as it is.',
        'When you change a node, rewrite its label, description and behavior where they no longer match, so they never contradict its type and properties.',
        'Keep the id of every node you keep; give new nodes a fresh short unique id. Keep the root id.',
        'Respond with ONLY a JSON object: {"node":{...the full updated tree...},"summary":"one short sentence describing what changed"}.'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `Component name: ${component.name}`,
        ...(component.description?.trim() ? [`Description: ${component.description.trim()}`] : []),
        '',
        'Current structure:',
        JSON.stringify(component.node, null, 1),
        '',
        `Requested change: ${prompt}`
      ].join('\n')
    }
  ];
}

function sanitizeTree(node: UiNode, rootId: string): UiNode {
  const seen = new Set([rootId]);
  function visit(item: UiNode, isRoot: boolean): UiNode {
    let id = isRoot ? rootId : item.id;
    if (!isRoot && (seen.has(id) || id.length > MAX_CHILD_ID_LENGTH || id.includes('~'))) {
      id = crypto.randomUUID();
    }
    seen.add(id);
    const properties = { ...item.properties };
    delete properties.componentId;
    return {
      ...item,
      id,
      properties,
      children: CONTAINER_TYPES.has(item.type)
        ? item.children.map((child) => visit(child, false))
        : []
    };
  }
  return toComponentNode(visit(node, true));
}

/**
 * Asks OpenRouter to rewrite the component's structure tree from a plain-language request and
 * saves it. The preview is left as is; the caller regenerates it from the new structure.
 */
export async function vibeEditComponent(
  supabase: SupabaseClient<Database>,
  id: string,
  prompt: string,
  userId: string
): Promise<VibeEditResult> {
  const component = await getDesignComponent(supabase, id);
  if (!component) throw new Error('Component not found');

  const answer = await requestJson({
    model:
      process.env.DESIGN_COMPONENT_VIBE_MODEL?.trim() ||
      process.env.DESIGN_COMPONENT_PREVIEW_MODEL?.trim() ||
      DEFAULT_DESIGN_MODEL,
    messages: buildMessages(component, prompt),
    maxTokens: 12000,
    temperature: 0.2
  });
  const parsed = uiNodeSchema.safeParse(normalizeRaw(answer?.node));
  if (!parsed.success) throw new Error('The model did not return a valid structure');

  const node = sanitizeTree(parsed.data, component.node.id);
  const saved = await updateComponent(
    supabase,
    id,
    { node, name: node.label.trim() || component.name },
    userId
  );
  if (!saved) throw new Error('Component not found');

  const summary = typeof answer?.summary === 'string' ? answer.summary.trim().slice(0, 500) : '';
  return { component: saved, summary: summary || 'Structure updated.' };
}
