import { apiClient } from '@/lib/api-client';
import type { DesignBoard, DesignBoardScene } from './types';

export async function getDesignBoard(): Promise<DesignBoard> {
  return apiClient<DesignBoard>('/design/board', { cache: 'no-store' });
}

export async function saveDesignBoard(scene: DesignBoardScene) {
  return apiClient<{ updatedAt: string }>('/design/board', {
    method: 'PUT',
    body: JSON.stringify({ scene })
  });
}
