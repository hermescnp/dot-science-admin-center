import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { featureSubtaskKeys } from './queries';
import { createFeatureSubtask, deleteFeatureSubtask, updateFeatureSubtask } from './service';
import type {
  FeatureSubtask,
  FeatureSubtaskCreatePayload,
  FeatureSubtaskUpdatePayload
} from './types';

async function patchCachedSubtasks(update: (subtasks: FeatureSubtask[]) => FeatureSubtask[]) {
  const queryClient = getQueryClient();
  await queryClient.cancelQueries({ queryKey: featureSubtaskKeys.all });
  const previous = queryClient.getQueryData<FeatureSubtask[]>(featureSubtaskKeys.list());
  if (previous) queryClient.setQueryData(featureSubtaskKeys.list(), update(previous));
  return { previous };
}

function restoreCachedSubtasks(context: { previous?: FeatureSubtask[] } | undefined) {
  if (context?.previous) getQueryClient().setQueryData(featureSubtaskKeys.list(), context.previous);
}

function invalidateSubtasks() {
  return getQueryClient().invalidateQueries({
    queryKey: featureSubtaskKeys.all
  });
}

export const createFeatureSubtaskMutation = mutationOptions({
  mutationFn: (data: FeatureSubtaskCreatePayload) => createFeatureSubtask(data),
  onSettled: invalidateSubtasks
});

export const updateFeatureSubtaskMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: FeatureSubtaskUpdatePayload }) =>
    updateFeatureSubtask(id, values),
  onMutate: ({ id, values }) =>
    patchCachedSubtasks((subtasks) =>
      subtasks.map((subtask) => (subtask.id === id ? { ...subtask, ...values } : subtask))
    ),
  onError: (_error, _variables, context) => restoreCachedSubtasks(context),
  onSettled: invalidateSubtasks
});

export const deleteFeatureSubtaskMutation = mutationOptions({
  mutationFn: (id: string) => deleteFeatureSubtask(id),
  onMutate: (id) => patchCachedSubtasks((subtasks) => subtasks.filter((item) => item.id !== id)),
  onError: (_error, _id, context) => restoreCachedSubtasks(context),
  onSettled: invalidateSubtasks
});
