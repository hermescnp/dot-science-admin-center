import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { updateLead } from './service';
import { leadKeys } from './queries';
import type { LeadUpdatePayload } from './types';

export const updateLeadMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: LeadUpdatePayload }) => updateLead(id, values),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: leadKeys.all });
  }
});
