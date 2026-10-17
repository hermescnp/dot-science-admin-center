import 'server-only';

import type { FrameRenderPayload } from '../api/types';
import { FRAME_INTERPRET_MODEL, requestJson, type ChatMessage } from './openrouter';

export type FrameComposition = 'exact' | 'loose' | 'none';

/** What the image model gets: the written prompt and how the frame screenshot is used. */
export interface FrameBrief {
  prompt: string;
  attachImage: boolean;
  /** `exact` holds positions and sizes to the screenshot; `loose` uses it as reference only. */
  composition: FrameComposition;
}

const COMPOSITIONS: readonly FrameComposition[] = ['exact', 'loose', 'none'];

const SYSTEM_PROMPT = `You prepare requests for an image generation model from a designer's frame on a design board. You get a screenshot of the frame, the designer's description (it may be empty), the measured position and size of what is drawn in it, and the structure of any UI mockups in it. Work out what the frame content is for, then write the prompt.

What the frame content can be (several can apply at once):
- Nothing: the frame is empty (no measured elements, no mockups, a blank screenshot). The frame only sets the image size; the description is everything.
- A composition: a sketch of a scene or layout, with figures, objects, horizon or ground lines, or boxes placed deliberately. Positions, sizes and proportions are binding, however rough the strokes.
- A loose idea: rough scribbles, or a sketch the description clearly treats as inspiration or overrides. Use it for the subject or concept only.
- A palette or style reference: colour swatches, filled areas of colour, textures, a pasted reference picture. Use their colours or style, not their arrangement.
- UI mockups: interface wireframes that work as UX guidelines. They say what each screen shows, in what order and hierarchy, and what each part is for; their drawn sizes, spacing and proportions are placeholders, not a spec. Render them as real, polished interfaces designed with natural proportions (readable type, comfortable spacing, real imagery), following their structure rather than their geometry. The description may ask for a presentation (on a device, in a hand, in a setting) that reframes the image.
- Notes: handwritten or typed text that talks to the designer or the model ("make this blue", "logo here", arrows pointing at something). These are instructions, not content to draw. Text that belongs to the scene (a sign, a heading, a button label) is content.
When the description contradicts the frame, the description wins for what it explicitly mentions; everything else in the frame still applies.

Answer with one JSON object:
{
  "reading": "one sentence on what the frame contributes",
  "attachImage": true or false: whether the image model should see the screenshot; false only when it carries nothing useful, such as an empty frame,
  "composition": "exact" when positions and sizes in the frame are binding, "loose" when the screenshot is reference only (concept, colours, style, or UI mockups with nothing else composed around them), "none" when no screenshot is attached,
  "prompt": "the prompt for the image model"
}

How to write "prompt":
- English instructions to the image model. Describe the subject, setting, style, lighting and mood; expand a short description into a vivid, specific one without contradicting it.
- Say exactly how to use the attached image: which parts to keep, which colours or style to take, which notes to follow without drawing them.
- For an exact composition, describe every subject at the size it has in the frame (the measured elements say tiny, small, medium or large): a small figure is a small figure seen from afar in a wide scene. Never use framing words that change scale, such as close-up, portrait, medium shot or full-body shot.
- For UI mockups, ask for a well-designed interface that follows the screens' content and hierarchy, not a copy of the wireframe's boxes and proportions.
- Do not restate measured positions or the UI structure; they are appended for you when relevant.
- Refer to the screenshot as "the attached image"; never mention a frame, a board or a screenshot.
- Never ask for labels, captions, borders or a surrounding canvas.`;

const EDIT_IN_PLACE = [
  'Edit the attached image in place into a finished, enhanced image of the same scene; do not compose a new picture from it.',
  'The image is the canvas and its geometry stays pixel for pixel: replace each drawn element with a polished, realistic version that covers the same pixels (same outline, pose and size), and paint the empty white areas as background and setting.',
  'Do not add a border or the board around the frame, and do not write labels that are not in the image.'
].join(' ');

const COMPOSITION_RULES = [
  'The composition is fixed:',
  '- Same framing and camera: do not zoom in, crop, re-centre or change the point of view. A subject drawn off-centre stays off-centre; a horizon or ground line stays at its height.',
  '- Every element keeps its position, its size relative to the image and its proportions. Small elements stay small, even when they are the subject: a figure drawn at a tenth of the image height is rendered at a tenth of it, never brought closer or enlarged.',
  '- Tiny or small subjects mean a long, wide shot with the subject small in the frame and plenty of surroundings around it.',
  '- A drawn figure keeps its pose, its height-to-width ratio and the relative size of its parts (head, body, limbs) as drawn, rendered in the style asked for.',
  '- Empty areas stay empty of new subjects: fill them only with background, ground or setting.',
  '- Do not add, remove or merge elements.'
].join('\n');

const MOCKUP_EXCEPTION =
  'UI mockup screens are the exception inside their outline: each screen keeps its place and outline, but its content is a UX wireframe. Redesign that content as a real interface with natural proportions, following its elements, order and hierarchy rather than the drawn sizes and spacing.';

/** The rules that hold an `exact` render to the screenshot, with its measured layout. */
export function compositionBlock(layout: string | undefined, hasScreens: boolean) {
  return [
    EDIT_IN_PLACE,
    COMPOSITION_RULES,
    hasScreens && MOCKUP_EXCEPTION,
    layout &&
      `Measured layout of what is in the image, as percentages of its width (left–right) and height (top–bottom). Each element must cover the same span in the result, so check its height and width against these numbers:\n${layout}`
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** Used when the interpreter fails: render the frame as drawn, with the direction as styling. */
function fallbackBrief({ prompt }: FrameRenderPayload): FrameBrief {
  return {
    prompt: [
      'The attached image is a sketch of a scene, layout or interface. Render it as a finished image.',
      prompt &&
        `Apply this direction to style, materials, lighting, setting and detail, never to the layout: ${prompt}`
    ]
      .filter(Boolean)
      .join(' '),
    attachImage: true,
    composition: 'exact'
  };
}

function buildMessages({
  prompt,
  screens,
  layout,
  image,
  width,
  height
}: FrameRenderPayload): ChatMessage[] {
  const text = [
    `Designer's description: ${prompt || '(none)'}`,
    `Frame size: ${Math.round(width)}×${Math.round(height)}`,
    `Measured elements, as percentages of the frame:\n${layout || '(nothing drawn)'}`,
    `UI mockups in the frame:\n${screens || '(none)'}`
  ].join('\n\n');
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text },
        { type: 'image_url', image_url: { url: image } }
      ]
    }
  ];
}

/**
 * Reads the frame with a fast vision model to decide what its content is for (nothing, a binding
 * composition, a loose reference, UI to render, notes) and writes the image model's prompt.
 */
export async function interpretFrame(payload: FrameRenderPayload): Promise<FrameBrief> {
  const empty = !payload.layout && !payload.screens;
  const answer = await requestJson({
    model: FRAME_INTERPRET_MODEL,
    messages: buildMessages(payload),
    maxTokens: 2000,
    temperature: 0.2
  }).catch(() => null);

  const prompt = typeof answer?.prompt === 'string' ? answer.prompt.trim() : '';
  if (!prompt) {
    return empty
      ? { prompt: payload.prompt, attachImage: false, composition: 'none' }
      : fallbackBrief(payload);
  }

  const attachImage = !empty && answer?.attachImage !== false;
  if (!attachImage) return { prompt, attachImage, composition: 'none' };
  const composition = COMPOSITIONS.find((value) => value === answer?.composition) ?? 'exact';
  return { prompt, attachImage, composition: composition === 'none' ? 'loose' : composition };
}
