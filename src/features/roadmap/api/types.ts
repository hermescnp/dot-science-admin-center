import type { PlatformFeature } from '@/features/platform-features/api/types';

export interface RoadmapItem extends PlatformFeature {
  subtasksDone: number;
  subtasksTotal: number;
}

export interface RoadmapResponse {
  items: RoadmapItem[];
}

export type RoadmapZoom = 'month' | 'quarter';
