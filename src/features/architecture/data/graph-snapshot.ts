import type { ArchitectureGraphSnapshot } from '../api/types';
import { architectureEdges, architectureNodes, architectureSeedHash } from './architecture-graph';

/**
 * Only node positions are taken from a saved snapshot; nodes and edges always come from code,
 * so a snapshot saved from a stale client can't strip pins or products from the graph.
 */
export function resolveArchitectureGraph(
  saved: ArchitectureGraphSnapshot | null
): ArchitectureGraphSnapshot {
  const savedPositions = new Map(saved?.nodes.map((node) => [node.id, node.position]));
  return {
    nodes: architectureNodes.map((node) => ({
      ...node,
      position: savedPositions.get(node.id) ?? node.position
    })),
    edges: architectureEdges,
    seedHash: architectureSeedHash
  };
}
