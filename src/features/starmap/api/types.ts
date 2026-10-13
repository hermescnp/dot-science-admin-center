/** Learning graph built by hermes-agent `agent.learning_graph.build_learning_graph()`. */

/** One graph node in the star map (learned skill or memory chunk). */
export interface StarmapNode {
  id: string;
  label: string;
  kind: 'memory' | 'skill';
  memorySource?: 'memory' | 'profile';
  timestamp?: null | number;
  category: string;
  useCount: number;
  state: string;
  createdBy: null | string;
  pinned: boolean;
}

export interface StarmapEdge {
  source: string;
  target: string;
}

export interface StarmapCluster {
  category: string;
  count: number;
}

export interface StarmapMemoryCard {
  source: 'memory' | 'profile';
  timestamp?: null | number;
  title: string;
  body: string;
  fingerprint?: string;
}

export interface StarmapGraph {
  nodes: StarmapNode[];
  edges: StarmapEdge[];
  clusters: StarmapCluster[];
  memory: StarmapMemoryCard[];
  stats: Record<string, unknown>;
}

export interface StarmapSnapshot {
  id: string;
  profile: string;
  graph: StarmapGraph;
  createdAt: string;
  /** Built-in example graph, shown until a real snapshot is pushed. */
  demo?: boolean;
}

export interface StarmapSnapshotResponse {
  snapshot: StarmapSnapshot | null;
}
