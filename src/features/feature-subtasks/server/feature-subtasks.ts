import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FeatureSubtask,
  FeatureSubtaskCreatePayload,
  FeatureSubtaskUpdatePayload
} from '../api/types';

type Client = SupabaseClient<Database>;
type FeatureSubtaskRow = Pick<
  Database['public']['Tables']['platform_feature_subtasks']['Row'],
  'id' | 'feature_id' | 'title' | 'done' | 'position'
>;

const COLUMNS = 'id, feature_id, title, done, position';

function toFeatureSubtask(row: FeatureSubtaskRow): FeatureSubtask {
  return {
    id: row.id,
    featureId: row.feature_id,
    title: row.title,
    done: row.done,
    position: row.position
  };
}

export async function listFeatureSubtasks(supabase: Client): Promise<FeatureSubtask[]> {
  const { data, error } = await supabase
    .from('platform_feature_subtasks')
    .select(COLUMNS)
    .order('feature_id')
    .order('position')
    .order('created_at');
  if (error) throw new Error(error.message);
  return data.map(toFeatureSubtask);
}

export async function createFeatureSubtask(
  supabase: Client,
  payload: FeatureSubtaskCreatePayload
): Promise<FeatureSubtask> {
  const { data: last, error: positionError } = await supabase
    .from('platform_feature_subtasks')
    .select('position')
    .eq('feature_id', payload.featureId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (positionError) throw new Error(positionError.message);

  const { data, error } = await supabase
    .from('platform_feature_subtasks')
    .insert({
      feature_id: payload.featureId,
      title: payload.title,
      position: last ? last.position + 1 : 0
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toFeatureSubtask(data);
}

export async function updateFeatureSubtask(
  supabase: Client,
  id: string,
  payload: FeatureSubtaskUpdatePayload
): Promise<FeatureSubtask | null> {
  const { data, error } = await supabase
    .from('platform_feature_subtasks')
    .update(payload)
    .eq('id', id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toFeatureSubtask(data) : null;
}

export async function deleteFeatureSubtask(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('platform_feature_subtasks')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}
