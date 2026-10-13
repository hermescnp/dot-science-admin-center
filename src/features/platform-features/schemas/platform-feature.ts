import * as z from 'zod';
import { platformNodesById, serviceNodesById } from '../constants/options';

const featureFields = {
  platformId: z.string().refine((id) => platformNodesById.has(id), 'Select a platform'),
  section: z.enum(['general', 'create', 'agora', 'studio', 'about'], 'Select a section'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  description: z.string().trim().min(2, 'Add a short description').max(240),
  icon: z.string().min(1, 'Select an icon'),
  services: z
    .array(z.string())
    .refine((ids) => ids.every((id) => serviceNodesById.has(id)), 'Unknown service'),
  status: z.enum(['planned', 'designed', 'in_development', 'developed'], 'Select a status')
};

const datesInOrder = {
  check: <T extends string | Date>(value: { startDate?: T | null; targetDate?: T | null }) =>
    !value.startDate || !value.targetDate || value.startDate <= value.targetDate,
  options: { message: 'Target date must be on or after the start date', path: ['targetDate'] }
};

export const platformFeatureSchema = z
  .object({
    ...featureFields,
    startDate: z.iso.date().nullable(),
    targetDate: z.iso.date().nullable()
  })
  .refine(datesInOrder.check, datesInOrder.options);

export const platformFeatureFormSchema = z
  .object({
    ...featureFields,
    startDate: z.date().optional(),
    targetDate: z.date().optional()
  })
  .refine(datesInOrder.check, datesInOrder.options);

export type PlatformFeatureFormValues = z.infer<typeof platformFeatureFormSchema>;
