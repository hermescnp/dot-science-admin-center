import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { updateUser } from './service';
import { userKeys } from './queries';
import type { UserUpdatePayload } from './types';

export const updateUserMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: UserUpdatePayload }) => updateUser(id, values),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: userKeys.all });
  }
});
