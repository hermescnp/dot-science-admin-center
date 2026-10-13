import { z } from 'zod';

export const MAX_LAYER_CONTENT_BYTES = 200 * 1024;

export interface KnowledgeLayer {
  id: string;
  sectionId: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
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
      (value) => new TextEncoder().encode(value).length <= MAX_LAYER_CONTENT_BYTES,
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
