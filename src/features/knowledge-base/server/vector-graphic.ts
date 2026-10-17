import {
  buildVectorGraphicPromptMessages,
  extractSvgFromModelOutput
} from '@hermescnp/content-blocks';
import type { GenerateVectorGraphicPayload } from '../api/types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-3.5-flash';

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
}

/** Asks OpenRouter for an SVG and returns it sanitized; throws when none comes back. */
export async function generateVectorGraphicSvg(
  payload: GenerateVectorGraphicPayload
): Promise<string> {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) throw new Error('OPENROUTER_KEY is not configured');

  const messages = buildVectorGraphicPromptMessages({
    description: payload.description,
    format: 'json',
    documentTitle: payload.layerTitle,
    currentSvg: payload.currentSvg?.trim() || undefined
  });

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.KB_SVG_MODEL?.trim() || DEFAULT_MODEL,
      messages,
      temperature: 0.5,
      max_tokens: 12000,
      response_format: { type: 'json_object' }
    })
  });
  const data = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `OpenRouter error ${response.status}`);
  }

  const svg = extractSvgFromModelOutput(data?.choices?.[0]?.message?.content ?? '');
  if (!svg) throw new Error('The model did not return a valid SVG');
  return svg;
}
