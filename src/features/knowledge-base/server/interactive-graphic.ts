import 'server-only';

import {
  buildInteractiveGraphicPromptMessages,
  extractInteractiveFromModelOutput
} from '@hermescnp/content-blocks';
import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { GenerateInteractiveGraphicPayload } from '../api/types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-5.5';
const BRAND_LAYER_SLUGS = ['color-palettes', 'typography'];
const BRAND_LAYER_MAX_CHARS = 3000;
const FENCED_CODE = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\1[ \t]*$/gm;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
}

/** The Brand Identity layers as prose: embedded graphics and block-id comments carry no guidance. */
async function loadBrandGuidelines(supabase: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await supabase
    .from('knowledge_layers')
    .select('slug, title, content')
    .in('slug', BRAND_LAYER_SLUGS);
  if (error || !data) return '';
  return BRAND_LAYER_SLUGS.flatMap((slug) => {
    const layer = data.find((row) => row.slug === slug);
    const text = layer?.content
      .replace(FENCED_CODE, '')
      .replace(HTML_COMMENT, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, BRAND_LAYER_MAX_CHARS);
    return layer && text ? [`## ${layer.title}\n${text}`] : [];
  }).join('\n\n');
}

/** Asks OpenRouter for a self-contained HTML/CSS/JS snippet; throws when none comes back. */
export async function generateInteractiveGraphicCode(
  supabase: SupabaseClient<Database>,
  payload: GenerateInteractiveGraphicPayload
): Promise<string> {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) throw new Error('OPENROUTER_KEY is not configured');

  const messages = buildInteractiveGraphicPromptMessages({
    description: payload.description,
    format: 'html',
    height: payload.height,
    documentTitle: payload.layerTitle,
    brandNotes: await loadBrandGuidelines(supabase),
    currentCode: payload.currentCode?.trim() || undefined
  });

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.KB_INTERACTIVE_MODEL?.trim() || DEFAULT_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 16000
    })
  });
  const data = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `OpenRouter error ${response.status}`);
  }

  const code = extractInteractiveFromModelOutput(data?.choices?.[0]?.message?.content ?? '');
  if (!code) throw new Error('The model did not return a usable HTML snippet');
  return code;
}
