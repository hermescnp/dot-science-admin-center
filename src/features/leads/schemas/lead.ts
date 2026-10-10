import { z } from 'zod';
import { leadEmailStatuses, leadSources, leadStatuses } from '../api/types';

export const leadFormSchema = z.object({
  status: z.enum(leadStatuses),
  notes: z.string().max(4000, 'Notes are limited to 4000 characters')
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const leadUpdateSchema = leadFormSchema;

function csvOf<T extends readonly [string, ...string[]]>(values: T) {
  return z
    .string()
    .transform((value) => value.split(',').filter(Boolean))
    .pipe(z.array(z.enum(values)))
    .optional()
    .catch(undefined);
}

export const leadListQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce.number().int().positive().max(100).catch(10),
  search: z.string().trim().min(1).max(200).optional().catch(undefined),
  statuses: csvOf(leadStatuses),
  sources: csvOf(leadSources),
  emailStatuses: csvOf(leadEmailStatuses),
  sort: z
    .enum([
      'name.asc',
      'name.desc',
      'email.asc',
      'email.desc',
      'status.asc',
      'status.desc',
      'verified.asc',
      'verified.desc',
      'first_captured.asc',
      'first_captured.desc',
      'last_captured.asc',
      'last_captured.desc'
    ])
    .optional()
    .catch(undefined)
});
