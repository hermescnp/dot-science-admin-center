import { apiClient } from '@/lib/api-client';
import type {
  ComponentPayload,
  CreateLayerPayload,
  DesignComponent,
  DesignLayer,
  DesignSection,
  DiagramFlowPayload,
  DiagramFlowResult,
  DrawIntoLayoutPayload,
  DrawIntoLayoutResult,
  FrameRenderPayload,
  FrameRenderResult,
  RefinePreviewPayload,
  ScenePayload,
  SectionTitlePayload,
  UpdateComponentPayload,
  UpdateLayerPayload,
  VibeEditPayload,
  VibeEditResult
} from './types';

export async function getDesignSections(): Promise<DesignSection[]> {
  return apiClient<DesignSection[]>('/design/sections', { cache: 'no-store' });
}

export async function createSection(payload: SectionTitlePayload): Promise<DesignSection> {
  return apiClient<DesignSection>('/design/sections', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function renameSection(id: string, payload: SectionTitlePayload) {
  return apiClient<{ ok: true }>(`/design/sections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteSection(id: string) {
  return apiClient<{ ok: true }>(`/design/sections/${id}`, { method: 'DELETE' });
}

export async function saveSectionScene(sectionId: string, scene: ScenePayload) {
  return apiClient<{ updatedAt: string }>(`/design/sections/${sectionId}/scene`, {
    method: 'PUT',
    body: JSON.stringify(scene)
  });
}

export async function createLayer(payload: CreateLayerPayload): Promise<DesignLayer> {
  return apiClient<DesignLayer>('/design/layers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateLayer(id: string, payload: UpdateLayerPayload): Promise<DesignLayer> {
  return apiClient<DesignLayer>(`/design/layers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteLayer(id: string) {
  return apiClient<{ ok: true }>(`/design/layers/${id}`, { method: 'DELETE' });
}

export async function getDesignComponents(): Promise<DesignComponent[]> {
  return apiClient<DesignComponent[]>('/design/components', { cache: 'no-store' });
}

export async function createComponent(payload: ComponentPayload): Promise<DesignComponent> {
  return apiClient<DesignComponent>('/design/components', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateComponent(
  id: string,
  payload: UpdateComponentPayload
): Promise<DesignComponent> {
  return apiClient<DesignComponent>(`/design/components/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteComponent(id: string) {
  return apiClient<{ ok: true }>(`/design/components/${id}`, { method: 'DELETE' });
}

/** Asks the model for an interactive wireframe preview + description for this component. */
export async function refineComponentPreview(
  id: string,
  payload: RefinePreviewPayload = {}
): Promise<DesignComponent> {
  return apiClient<DesignComponent>(`/design/components/${id}/preview`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Renders a frame's screenshot into a finished image, steered by the user's prompt. Model failures
 * are worth showing, so the server's error message is kept.
 */
export async function renderFrame(payload: FrameRenderPayload): Promise<FrameRenderResult> {
  const response = await fetch('/api/design/frame-render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = (await response.json().catch(() => null)) as
    | (Partial<FrameRenderResult> & { error?: string })
    | null;
  if (!response.ok || !data?.dataUrl) {
    throw new Error(data?.error ?? `The render failed (${response.status})`);
  }
  return { dataUrl: data.dataUrl };
}

/** Writes Mermaid for the Diagram Flow dialog from a description; keeps the server's error. */
export async function generateDiagramFlow(payload: DiagramFlowPayload): Promise<DiagramFlowResult> {
  const response = await fetch('/api/design/diagram-flow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = (await response.json().catch(() => null)) as
    | (Partial<DiagramFlowResult> & { error?: string })
    | null;
  if (!response.ok || !data?.mermaid) {
    throw new Error(data?.error ?? `The diagram failed (${response.status})`);
  }
  return { mermaid: data.mermaid };
}

/** The screen's structure with the drawings over it applied; keeps the server's error. */
export async function drawIntoLayout(
  payload: DrawIntoLayoutPayload
): Promise<DrawIntoLayoutResult> {
  const response = await fetch('/api/design/draw-into-layout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = (await response.json().catch(() => null)) as
    | (Partial<DrawIntoLayoutResult> & { error?: string })
    | null;
  if (!response.ok || !Array.isArray(data?.nodes)) {
    throw new Error(data?.error ?? `Drawing into the layout failed (${response.status})`);
  }
  return { nodes: data.nodes, summary: data.summary ?? '' };
}

/** Rewrites the component's structure from a plain-language request; the preview is not touched. */
export async function vibeEditComponent(
  id: string,
  payload: VibeEditPayload
): Promise<VibeEditResult> {
  return apiClient<VibeEditResult>(`/design/components/${id}/vibe-edit`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
