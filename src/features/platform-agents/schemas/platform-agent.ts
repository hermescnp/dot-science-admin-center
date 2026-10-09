import * as z from 'zod';
import {
  platformNodesById,
  serviceNodesById
} from '@/features/platform-features/constants/options';

const statuses = ['planned', 'designed', 'in_development', 'developed'] as const;

/** Select value for a model with no service node; selects can't hold an empty value. */
export const NO_MODEL_SERVICE = 'none';

export const agentModelSchema = z.object({
  slug: z.string().trim().min(1, 'Add the model slug').max(120),
  role: z.enum(['primary', 'fallback', 'delivery', 'stt', 'downstream'], 'Select a role'),
  nodeId: z
    .string()
    .optional()
    .refine((id) => !id || id === NO_MODEL_SERVICE || serviceNodesById.has(id), 'Unknown service')
    .transform((id) => (id && id !== NO_MODEL_SERVICE ? id : undefined))
});

export const platformAgentSchema = z.object({
  platformId: z.string().refine((id) => platformNodesById.has(id), 'Select a platform'),
  kind: z.enum(['agent', 'subagent', 'orchestrator'], 'Select a kind'),
  status: z.enum(statuses, 'Select a status'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80)
    .regex(/[a-z0-9]/i, 'Use letters or numbers in the name'),
  archetypeTitle: z.string().trim().min(2, 'Add a pattern').max(80),
  archetypeIcon: z.string().min(1, 'Select an icon'),
  purpose: z.string().trim().min(2, 'Add a short purpose').max(400),
  runtime: z.string().trim().min(2, 'Add the runtime').max(160),
  entry: z.string().trim().max(160),
  repo: z.string().trim().min(2, 'Add the repository').max(120),
  models: z.array(agentModelSchema).max(6),
  modelNote: z.string().trim().max(240),
  temperature: z.number().min(0).max(2).optional(),
  memory: z.string().trim().max(400)
});

export type PlatformAgentFormValues = z.input<typeof platformAgentSchema>;
