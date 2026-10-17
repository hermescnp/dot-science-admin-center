import 'server-only';

import type { FrameRenderPayload, FrameRenderResult } from '../api/types';
import { compositionBlock, interpretFrame } from './frame-interpret';
import { FRAME_RENDER_MODEL, OPENROUTER_URL, type ContentPart } from './openrouter';

/** The aspect ratios the image model accepts. */
const ASPECT_RATIOS = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9'
] as const;

interface ImagePart {
  type?: string;
  image_url?: { url?: string };
}

interface ImageCompletionResponse {
  choices?: {
    message?: {
      content?: string | ImagePart[] | null;
      images?: { image_url?: { url?: string }; url?: string }[];
    };
  }[];
  error?: { message?: string };
}

/** The supported aspect ratio closest to `width`×`height`, compared on a log scale. */
export function nearestAspectRatio(width: number, height: number): string {
  const target = Math.log(width / height);
  let best: string = ASPECT_RATIOS[0];
  let bestDistance = Infinity;
  for (const ratio of ASPECT_RATIOS) {
    const [w, h] = ratio.split(':').map(Number);
    const distance = Math.abs(Math.log(w / h) - target);
    if (distance < bestDistance) {
      best = ratio;
      bestDistance = distance;
    }
  }
  return best;
}

function imageFromResponse(data: ImageCompletionResponse | null): string | null {
  const message = data?.choices?.[0]?.message;
  if (!message) return null;
  for (const image of message.images ?? []) {
    const url = image.image_url?.url ?? image.url;
    if (url?.trim()) return url.trim();
  }
  const { content } = message;
  if (Array.isArray(content)) {
    for (const part of content) {
      const url = part.image_url?.url;
      if (url?.trim()) return url.trim();
    }
  }
  if (typeof content === 'string') {
    return /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/.exec(content)?.[0] ?? null;
  }
  return null;
}

const SCREENS_INSTRUCTION = [
  'The attached image contains UI mockups. They are wireframes used as UX guidelines: the structure below is the source of truth, one screen at a time, top to bottom, each element with its type, key properties and purpose, nested like the screen.',
  'Design each screen as a polished, real interface with that content, order and hierarchy. The wireframe’s drawn sizes, spacing and proportions are placeholders: give elements natural proportions (readable type, comfortable spacing, real imagery and controls) instead of copying its boxes.'
].join(' ');

/**
 * Has the interpreter read the frame (screenshot, measured layout, mockup structure, the user's
 * direction) and write the request, then sends it to the image model, with the screenshot only
 * when the frame contributes something.
 */
export async function renderFrameImage(payload: FrameRenderPayload): Promise<FrameRenderResult> {
  const { screens, layout, image, width, height } = payload;
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) throw new Error('OPENROUTER_KEY is not configured');

  const brief = await interpretFrame(payload);
  const text = [
    brief.composition === 'exact' && compositionBlock(layout, Boolean(screens)),
    brief.prompt,
    brief.attachImage && screens && `${SCREENS_INSTRUCTION}\n\n${screens}`
  ]
    .filter(Boolean)
    .join('\n\n');
  const content: ContentPart[] = [{ type: 'text', text }];
  if (brief.attachImage) content.push({ type: 'image_url', image_url: { url: image } });

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: FRAME_RENDER_MODEL,
      messages: [{ role: 'user', content }],
      modalities: ['image', 'text'],
      image_config: { aspect_ratio: nearestAspectRatio(width, height) }
    })
  });
  const data = (await response.json().catch(() => null)) as ImageCompletionResponse | null;
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `OpenRouter error ${response.status}`);
  }
  const dataUrl = imageFromResponse(data);
  if (!dataUrl) throw new Error('The model did not return an image');
  return { dataUrl };
}
