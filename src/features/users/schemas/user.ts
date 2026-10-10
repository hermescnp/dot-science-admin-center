import { z } from 'zod';

export const NO_PLAN = 'none';

export const userFormSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required').max(120),
  isPlatformAdmin: z.boolean(),
  billingPlanId: z.string()
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const userUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  isPlatformAdmin: z.boolean(),
  billingPlanId: z.uuid().nullable()
});

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce.number().int().positive().max(100).catch(10),
  search: z.string().trim().min(1).max(200).optional().catch(undefined),
  admin: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional()
    .catch(undefined),
  plan: z.uuid().optional().catch(undefined),
  sort: z
    .enum([
      'name.asc',
      'name.desc',
      'email.asc',
      'email.desc',
      'created.asc',
      'created.desc',
      'last_sign_in.asc',
      'last_sign_in.desc',
      'last_seen.asc',
      'last_seen.desc'
    ])
    .optional()
    .catch(undefined)
});
