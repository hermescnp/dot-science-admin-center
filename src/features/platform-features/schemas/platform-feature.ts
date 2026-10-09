import * as z from 'zod';
import { platformNodesById, serviceNodesById } from '../constants/options';

export const platformFeatureSchema = z.object({
  platformId: z.string().refine((id) => platformNodesById.has(id), 'Select a platform'),
  section: z.enum(['general', 'create', 'agora', 'studio', 'about'], 'Select a section'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  description: z.string().trim().min(2, 'Add a short description').max(240),
  icon: z.string().min(1, 'Select an icon'),
  services: z
    .array(z.string())
    .refine((ids) => ids.every((id) => serviceNodesById.has(id)), 'Unknown service'),
  status: z.enum(['planned', 'designed', 'in_development', 'developed'], 'Select a status')
});

export type PlatformFeatureFormValues = z.infer<typeof platformFeatureSchema>;
