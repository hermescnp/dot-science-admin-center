import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listFeatureSubtasks } from '@/features/feature-subtasks/server/feature-subtasks';
import { listAllPlatformFeatures } from '@/features/platform-features/server/platform-features';
import type { RoadmapResponse } from '../api/types';

export async function getRoadmap(supabase: SupabaseClient<Database>): Promise<RoadmapResponse> {
  const [features, subtasks] = await Promise.all([
    listAllPlatformFeatures(supabase),
    listFeatureSubtasks(supabase)
  ]);

  const progress = new Map<string, { done: number; total: number }>();
  for (const subtask of subtasks) {
    const entry = progress.get(subtask.featureId) ?? { done: 0, total: 0 };
    entry.total += 1;
    if (subtask.done) entry.done += 1;
    progress.set(subtask.featureId, entry);
  }

  return {
    items: features.map((feature) => ({
      ...feature,
      subtasksDone: progress.get(feature.id)?.done ?? 0,
      subtasksTotal: progress.get(feature.id)?.total ?? 0
    }))
  };
}
