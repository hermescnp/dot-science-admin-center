import 'server-only';

import { DIAGRAM_FLOW_MODEL, requestJson } from './openrouter';

const SYSTEM_PROMPT = `You turn a description into a Mermaid diagram that will be converted into an editable whiteboard drawing.

Answer with one JSON object: {"mermaid": "the Mermaid definition"}

Rules for the definition:
- Use a flowchart ("flowchart TD", or "flowchart LR" for long horizontal processes) unless the description asks for interactions over time (then "sequenceDiagram") or for classes and their relations (then "classDiagram"). No other diagram types: they cannot be converted into shapes.
- Short, specific node labels in the language of the description. Use decision diamonds ({...}) for choices and label their outgoing edges.
- Wrap any label containing parentheses, brackets, commas, colons, quotes or other punctuation in double quotes, e.g. A["Send email (async)"]. Never put double quotes inside a label.
- Node IDs are simple words without spaces; never use "end", "graph", "flowchart" or "subgraph" as IDs.
- No styling: no style, classDef, class, linkStyle, click or %%{init}%% lines, and no Markdown fences.
- No subgraphs: the converter turns diagrams with subgraphs into a flat image instead of shapes. Show phases through the order of the nodes or a short prefix in their labels.
- Keep it readable: at most about 25 nodes.`;

const FENCE = /^```(?:mermaid)?\s*\n?([\s\S]*?)\n?```$/;

/** Writes a Mermaid flowchart, sequence or class diagram for the description. */
export async function generateMermaid(prompt: string): Promise<string> {
  const answer = await requestJson({
    model: DIAGRAM_FLOW_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    maxTokens: 4000,
    temperature: 0.3
  });
  const raw = typeof answer?.mermaid === 'string' ? answer.mermaid.trim() : '';
  const mermaid = (FENCE.exec(raw)?.[1] ?? raw).trim();
  if (!mermaid) throw new Error('The model did not return a diagram');
  return mermaid;
}
