import { apiClient } from '@/lib/api-client';
import type {
  CreateLayerPayload,
  CreateSectionPayload,
  GenerateInteractiveGraphicPayload,
  GenerateVectorGraphicPayload,
  KnowledgeBase,
  KnowledgeImage,
  KnowledgeLayer,
  KnowledgeSection,
  UpdateLayerPayload
} from './types';

export async function getKnowledgeBase(): Promise<KnowledgeBase> {
  return apiClient<KnowledgeBase>('/knowledge/layers', { cache: 'no-store' });
}

export async function createLayer(payload: CreateLayerPayload): Promise<KnowledgeLayer> {
  return apiClient<KnowledgeLayer>('/knowledge/layers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateLayer(id: string, payload: UpdateLayerPayload) {
  return apiClient<KnowledgeLayer>(`/knowledge/layers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteLayer(id: string) {
  return apiClient<{ ok: true }>(`/knowledge/layers/${id}`, { method: 'DELETE' });
}

export async function getKnowledgeImages(): Promise<KnowledgeImage[]> {
  const { images } = await apiClient<{ images: KnowledgeImage[] }>('/knowledge/images', {
    cache: 'no-store'
  });
  return images;
}

export async function uploadKnowledgeImage(file: File): Promise<KnowledgeImage> {
  const body = new FormData();
  body.append('file', file);
  // Empty headers let the browser set the multipart boundary.
  return apiClient<KnowledgeImage>('/knowledge/images', { method: 'POST', headers: {}, body });
}

export async function createSection(payload: CreateSectionPayload) {
  return apiClient<Omit<KnowledgeSection, 'layers'>>('/knowledge/sections', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function generateVectorGraphic(
  payload: GenerateVectorGraphicPayload
): Promise<{ svg: string }> {
  return apiClient<{ svg: string }>('/knowledge/vector-graphic', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function generateInteractiveGraphic(
  payload: GenerateInteractiveGraphicPayload
): Promise<{ code: string }> {
  return apiClient<{ code: string }>('/knowledge/interactive-graphic', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
