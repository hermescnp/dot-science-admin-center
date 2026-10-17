import 'server-only';

import { z } from 'zod';
import {
  SCREEN_SIZES,
  uiNodeSchema,
  type DrawIntoLayoutPayload,
  type DrawIntoLayoutResult,
  type UiNode
} from '../api/types';
import { CONTAINER_TYPES } from '../lib/node-tree';
import {
  DEFAULT_DESIGN_MODEL,
  NODE_PROPERTY_GUIDE,
  requestJson,
  type ChatMessage
} from './openrouter';
import { NODE_TREE_REFERENCE, normalizeRaw } from './ui-node-output';

const MAX_ID_LENGTH = 64;
/** The model now and then answers with stray markup and no layout; one retry usually lands. */
const MAX_ATTEMPTS = 2;
/** Instance children carry their instance's prefix before this separator. */
const INSTANCE_ID_SEPARATOR = '~';

const SYSTEM_PROMPT = [
  'You update the structure tree of a UI mockup screen on a wireframe design board from what the user drew over it.',
  NODE_TREE_REFERENCE,
  NODE_PROPERTY_GUIDE,
  '',
  "The image shows the screen as a hand-drawn wireframe with the user's drawings on top. The drawings are instructions for the layout:",
  '- A sketched box, shape, line or text sitting where there is no element means a new element: infer its type from its shape and any handwriting (a box with a word is usually a button, a long box with a label a field, a box with a cross an image, lines of scribble text, stacked repeats a list, and so on).',
  '- An element crossed out or scribbled over is removed.',
  '- An arrow from an element to another place moves it there; an arrow between elements, or one pointing at another screen, describes navigation: put it in the behavior of the button or element it starts from.',
  '- Handwritten words that name or relabel an element are its label or content. Notes that read as instructions ("make this bigger", "add filters", "2 columns") are applied, never copied into the screen as text.',
  '- Drawings that group or split elements (a box around several, a dividing line) change the containers and row/column layout.',
  'Drawn sizes and proportions are rough guidance, not measurements: express them through the structure (order, containers, row vs column, width fill/hug/percent) rather than copying the geometry.',
  'Leave everything the drawings do not touch exactly as it is, in the same order.',
  'Nodes marked as component instances are reusable components: never change their label, type, properties or children; you may only move them or remove them. Keep them as they are given, with "children": [].',
  'When you change a node, rewrite its label, description and behavior where they no longer match, so they never contradict its type and properties.',
  'Keep the id of every node you keep; give new nodes a fresh short unique id without "~".',
  'Respond with ONLY a JSON object: {"nodes":[...the full updated list of root nodes, top to bottom...],"summary":"one short sentence describing what changed"}.'
].join('\n');

/** Instances go to the model as leaves: their content belongs to the component. */
function collapseInstances(nodes: UiNode[]): UiNode[] {
  return nodes.map((node) =>
    node.properties?.componentId
      ? { ...node, children: [] }
      : { ...node, children: collapseInstances(node.children) }
  );
}

function collectInstances(nodes: UiNode[], into = new Map<string, UiNode>()) {
  for (const node of nodes) {
    if (node.properties?.componentId) into.set(node.id, node);
    else collectInstances(node.children, into);
  }
  return into;
}

/**
 * The model's tree made safe to save: instances are put back exactly as they were (only their
 * place may change), stray instance links are dropped, and repeated or malformed ids replaced.
 */
function sanitizeNodes(nodes: UiNode[], original: UiNode[]): UiNode[] {
  const instances = collectInstances(original);
  const seen = new Set<string>();
  function visit(node: UiNode): UiNode[] {
    const instance = instances.get(node.id);
    if (instance) {
      if (seen.has(node.id)) return [];
      seen.add(node.id);
      return [instance];
    }
    let id = node.id;
    if (seen.has(id) || id.length > MAX_ID_LENGTH || id.includes(INSTANCE_ID_SEPARATOR)) {
      id = crypto.randomUUID();
    }
    seen.add(id);
    const properties = { ...node.properties };
    delete properties.componentId;
    return [
      {
        ...node,
        id,
        properties,
        children: CONTAINER_TYPES.has(node.type) ? node.children.flatMap(visit) : []
      }
    ];
  }
  return nodes.flatMap(visit);
}

function buildMessages(payload: DrawIntoLayoutPayload): ChatMessage[] {
  const { width } = SCREEN_SIZES[payload.device];
  const text = [
    `Device: ${payload.device} (${width} px wide).`,
    '',
    'Current structure (root nodes, top to bottom):',
    JSON.stringify(collapseInstances(payload.nodes), null, 1),
    '',
    'Where each element of the screen sits, as percentages of the screen:',
    payload.elements || '(the screen is empty)',
    '',
    'Where the drawings sit, as percentages of the screen:',
    payload.drawings || '(see the image)'
  ].join('\n');
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text },
        { type: 'image_url', image_url: { url: payload.image } }
      ]
    }
  ];
}

/** Reads the drawings over a mockup screen and returns its structure with them applied. */
export async function drawIntoLayout(
  payload: DrawIntoLayoutPayload
): Promise<DrawIntoLayoutResult> {
  const messages = buildMessages(payload);
  let answer: Record<string, unknown> | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS && !answer; attempt += 1) {
    answer = await requestJson({
      model: DEFAULT_DESIGN_MODEL,
      messages,
      maxTokens: 16000,
      temperature: 0.2,
      accept: (value) => Array.isArray(value.nodes)
    });
  }
  if (!answer || !Array.isArray(answer.nodes)) {
    throw new Error('The model did not return a layout');
  }
  const parsed = z.array(uiNodeSchema).safeParse(answer.nodes.map(normalizeRaw));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(
      `The model returned an invalid layout (${issue?.path.join('.')}: ${issue?.message})`
    );
  }

  const summary = typeof answer?.summary === 'string' ? answer.summary.trim().slice(0, 500) : '';
  return {
    nodes: sanitizeNodes(parsed.data, payload.nodes),
    summary: summary || 'Drawings applied to the layout.'
  };
}
