import 'server-only';

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_DESIGN_MODEL = 'anthropic/claude-sonnet-5.5';
/** Nano Banana Pro: edits an input image while keeping its composition. */
export const FRAME_RENDER_MODEL = 'google/gemini-3-pro-image';
/** Fast vision model that reads a frame and writes the prompt for the image model. */
export const FRAME_INTERPRET_MODEL = 'google/gemini-3.5-flash';
/** Fast model that writes Mermaid for the Diagram Flow dialog. */
export const DIAGRAM_FLOW_MODEL = 'google/gemini-3.5-flash';

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
}

type JsonObject = Record<string, unknown>;

interface RequestJsonOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
  /** Which object in the answer is the one asked for; the first one when absent. */
  accept?: (value: JsonObject) => boolean;
}

function parseObject(text: string): JsonObject | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as JsonObject)
      : null;
  } catch {
    return null;
  }
}

/** Every top-level `{…}` in the text that parses as JSON, in order. */
function balancedObjects(text: string): JsonObject[] {
  const found: JsonObject[] = [];
  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
      } else if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth += 1;
      } else if (char === '}' && --depth === 0) {
        const parsed = parseObject(text.slice(start, index + 1));
        if (parsed) {
          found.push(parsed);
          start = index;
        }
        break;
      }
    }
  }
  return found;
}

/**
 * The JSON object in a model answer, fenced or bare; null when there is none. Models sometimes
 * wrap it in stray markup or an apology, so the answer is searched for an object that parses.
 */
export function parseJsonObject(
  output: string,
  accept: (value: JsonObject) => boolean = () => true
): JsonObject | null {
  const trimmed = output.trim();
  const fenced = /(`{3,})(?:json)?[^\n]*\n([\s\S]*?)\n\1/.exec(trimmed)?.[2]?.trim();
  const candidate = fenced ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const whole = parseObject(candidate.slice(start, end + 1));
  if (whole && accept(whole)) return whole;
  return balancedObjects(candidate).find(accept) ?? null;
}

/** Runs an OpenRouter chat completion that must answer with one JSON object. */
export async function requestJson({
  model,
  messages,
  maxTokens,
  temperature = 0.4,
  accept
}: RequestJsonOptions): Promise<JsonObject | null> {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) throw new Error('OPENROUTER_KEY is not configured');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }
    })
  });
  const data = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `OpenRouter error ${response.status}`);
  }
  const content = data?.choices?.[0]?.message?.content ?? '';
  const parsed = parseJsonObject(content, accept);
  if (!parsed)
    console.warn(
      `[openrouter] ${model} answered without the expected JSON:`,
      content.slice(0, 1000)
    );
  return parsed;
}

/** How node properties look in a wireframe; shared by the prompts that read or write the tree. */
export const NODE_PROPERTY_GUIDE =
  'Property guide: buttonType primary = filled button; basic = outlined button; tertiary = plain muted text; link = underlined text link (no box, no icon); image = icon-only round button; toggle = label with an on/off switch; floating-action = round "+" button. inputType picks the field control (select, checkbox, radio, slider, …). textStyle title = heading, body = regular text. visible=false containers group children without a drawn border.';
