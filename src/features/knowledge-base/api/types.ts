import { stripBlockIdComments, type SectionContentJson } from '@hermescnp/content-blocks';
import { z } from 'zod';

export const MAX_LAYER_CONTENT_BYTES = 200 * 1024;

export interface KnowledgeLayer {
  id: string;
  sectionId: string;
  slug: string;
  title: string;
  summary: string | null;
  /** Markdown source; every top-level block is preceded by its `<!-- block-id:… -->` comment. */
  content: string;
  /** Blocks with persistent ids and their segments, derived from `content`. */
  contentJson: SectionContentJson;
  position: number;
  updatedAt: string;
  updatedByName: string | null;
}

export interface KnowledgeSection {
  id: string;
  title: string;
  position: number;
  layers: KnowledgeLayer[];
}

export interface KnowledgeBase {
  sections: KnowledgeSection[];
}

const layerFields = {
  sectionId: z.string().uuid(),
  title: z.string().trim().min(1, 'Title is required').max(120),
  summary: z.string().trim().max(300).nullable(),
  content: z
    .string()
    .refine(
      (value) =>
        new TextEncoder().encode(stripBlockIdComments(value)).length <= MAX_LAYER_CONTENT_BYTES,
      'Content is larger than 200 KB'
    )
};

export const createLayerSchema = z.object(layerFields);
export const layerFormSchema = createLayerSchema.extend({
  summary: z.string().trim().max(300)
});
export const updateLayerSchema = z.object(layerFields).partial();
export const createSectionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(80)
});
export const generateVectorGraphicSchema = z.object({
  description: z.string().trim().min(1, 'Describe the graphic').max(2000),
  currentSvg: z.string().max(100_000).optional(),
  layerTitle: z.string().trim().max(200).optional()
});
export const generateInteractiveGraphicSchema = z.object({
  description: z.string().trim().min(1, 'Describe the interactive graphic').max(2000),
  currentCode: z.string().max(200_000).optional(),
  height: z.number().int().positive().optional(),
  layerTitle: z.string().trim().max(200).optional()
});

export interface KnowledgeImage {
  name: string;
  alt: string;
  url: string;
  createdAt: string | null;
}

/** Accepted upload types and the extension each is stored with. */
export const KNOWLEDGE_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg'
};
export const KNOWLEDGE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type CreateLayerPayload = z.infer<typeof createLayerSchema>;
export type UpdateLayerPayload = z.infer<typeof updateLayerSchema>;
export type CreateSectionPayload = z.infer<typeof createSectionSchema>;
export type GenerateVectorGraphicPayload = z.infer<typeof generateVectorGraphicSchema>;
export type GenerateInteractiveGraphicPayload = z.infer<typeof generateInteractiveGraphicSchema>;
