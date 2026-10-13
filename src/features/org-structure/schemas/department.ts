import * as z from 'zod';

/** Select value for "reports to Dot Science"; selects can't hold an empty value. */
export const ROOT_PARENT = 'dot-science';

export const departmentIdSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);

export const departmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80)
    .regex(/[a-z0-9]/i, 'Use letters or numbers in the name'),
  description: z.string().trim().max(400),
  longDescription: z.string().trim().max(10000),
  parentId: z
    .string()
    .nullable()
    .transform((id) => (id && id !== ROOT_PARENT ? id : null))
});

export const orgProfileSchema = z.object({
  longDescription: z.string().trim().max(10000)
});

export const departmentMemberSchema = z
  .object({
    kind: z.enum(['user', 'agent'], 'Select a member type'),
    refId: z.string().trim().min(1, 'Select a member'),
    role: z.string().trim().max(80)
  })
  .refine(
    ({ kind, refId }) =>
      kind === 'user'
        ? z.uuid().safeParse(refId).success
        : departmentIdSchema.safeParse(refId).success,
    { message: 'Invalid member', path: ['refId'] }
  );

export type DepartmentFormValues = z.input<typeof departmentSchema>;

export const DEPARTMENT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
export const DEPARTMENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
