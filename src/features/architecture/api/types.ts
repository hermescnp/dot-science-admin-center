import type { ArchitectureEdge, ArchitectureNode } from '../data/architecture-graph';

export interface ArchitectureGraphSnapshot {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  seedHash: string;
}

export interface ArchitectureGraphResponse {
  graph: (ArchitectureGraphSnapshot & { updatedAt: string }) | null;
}

export type ServiceHealthState = 'operational' | 'degraded' | 'down' | 'unconfigured';

export interface ServiceHealth {
  id: string;
  state: ServiceHealthState;
  latencyMs: number | null;
  checkedAt: string;
  message?: string;
}

export interface ServiceHealthResponse {
  services: ServiceHealth[];
}

export interface ServicePlanStatus {
  id: string;
  planId: string | null;
  source: 'detected' | 'unavailable';
  usage?: Record<string, string>;
  usageError?: string;
}

export interface ServicePlansResponse {
  services: ServicePlanStatus[];
}

/** Prices are USD per 1M tokens unless the field name says otherwise. */
export interface ModelPricing {
  slug: string;
  name: string;
  listed: boolean;
  inputPerM?: number;
  outputPerM?: number;
  cacheReadPerM?: number;
  cacheWritePerM?: number;
  reasoningPerM?: number;
  imageInputPerM?: number;
  imageOutputPerM?: number;
  audioInputPerM?: number;
  webSearchPerCall?: number;
  requestFee?: number;
  longContext?: { minPromptTokens: number; inputPerM?: number; outputPerM?: number };
  contextLength?: number;
  maxOutput?: number;
  inputModalities: string[];
  outputModalities: string[];
  features: string[];
}

export interface ModelPricingResponse {
  models: ModelPricing[];
  fetchedAt: string;
}
