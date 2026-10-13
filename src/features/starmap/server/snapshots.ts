import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StarmapGraph, StarmapSnapshotResponse } from '../api/types';
import { DEMO_STARMAP_SNAPSHOT } from './demo-snapshot';

type Client = SupabaseClient<Database>;

function toGraph(value: unknown): StarmapGraph {
  const graph = (value && typeof value === 'object' ? value : {}) as Partial<StarmapGraph>;
  return {
    nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
    edges: Array.isArray(graph.edges) ? graph.edges : [],
    clusters: Array.isArray(graph.clusters) ? graph.clusters : [],
    memory: Array.isArray(graph.memory) ? graph.memory : [],
    stats: graph.stats && typeof graph.stats === 'object' ? graph.stats : {}
  };
}

export async function getLatestStarmapSnapshot(supabase: Client): Promise<StarmapSnapshotResponse> {
  const { data, error } = await supabase
    .from('hermes_starmap_snapshots')
    .select('id, profile, graph, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { snapshot: DEMO_STARMAP_SNAPSHOT };
  return {
    snapshot: {
      id: data.id,
      profile: data.profile,
      graph: toGraph(data.graph),
      createdAt: data.created_at
    }
  };
}
