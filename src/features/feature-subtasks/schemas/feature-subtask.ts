import * as z from 'zod';

const title = z.string().trim().min(1, 'Add a title').max(160);

export const featureSubtaskCreateSchema = z.object({
  featureId: z.uuid(),
  title
});

export const featureSubtaskUpdateSchema = z
  .object({ title: title.optional(), done: z.boolean().optional() })
  .refine((value) => value.title !== undefined || value.done !== undefined, 'Nothing to update');
