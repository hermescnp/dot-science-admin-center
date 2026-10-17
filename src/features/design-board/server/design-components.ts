import 'server-only';

import type { Database, Json } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ComponentPart,
  ComponentPayload,
  DesignComponent,
  PreviewStatus,
  UiNode,
  UpdateComponentPayload
} from '../api/types';

type Client = SupabaseClient<Database>;
type ComponentRow = Database['public']['Tables']['design_components']['Row'];

const COMPONENT_COLUMNS =
  'id, name, node, description, parts, preview_html, preview_status, preview_error, updated_at' as const;

function toParts(value: Json): ComponentPart[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== 'string' ||
      typeof row.label !== 'string' ||
      typeof row.summary !== 'string'
    ) {
      return [];
    }
    return [{ id: row.id, label: row.label, summary: row.summary }];
  });
}

function toStatus(value: string): PreviewStatus {
  return value === 'ready' || value === 'error' ? value : 'pending';
}

function toComponent(
  row: Pick<
    ComponentRow,
    | 'id'
    | 'name'
    | 'node'
    | 'description'
    | 'parts'
    | 'preview_html'
    | 'preview_status'
    | 'preview_error'
    | 'updated_at'
  >
) {
  return {
    id: row.id,
    name: row.name,
    node: row.node as unknown as UiNode,
    description: row.description,
    parts: toParts(row.parts),
    previewHtml: row.preview_html,
    previewStatus: toStatus(row.preview_status),
    previewError: row.preview_error,
    updatedAt: row.updated_at
  } satisfies DesignComponent;
}

export async function getDesignComponents(supabase: Client): Promise<DesignComponent[]> {
  const { data, error } = await supabase
    .from('design_components')
    .select(COMPONENT_COLUMNS)
    .order('created_at');
  if (error) throw new Error(error.message);
  return data.map(toComponent);
}

export async function getDesignComponent(
  supabase: Client,
  id: string
): Promise<DesignComponent | null> {
  const { data, error } = await supabase
    .from('design_components')
    .select(COMPONENT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toComponent(data) : null;
}

export async function createComponent(
  supabase: Client,
  payload: ComponentPayload
): Promise<DesignComponent> {
  const { data, error } = await supabase
    .from('design_components')
    .insert({
      name: payload.name,
      node: payload.node as unknown as Json,
      preview_status: 'pending'
    })
    .select(COMPONENT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toComponent(data);
}

function toColumns(payload: UpdateComponentPayload, userId: string) {
  return {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.node !== undefined ? { node: payload.node as unknown as Json } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.parts !== undefined ? { parts: payload.parts as unknown as Json } : {}),
    ...(payload.previewHtml !== undefined ? { preview_html: payload.previewHtml } : {}),
    ...(payload.previewStatus !== undefined ? { preview_status: payload.previewStatus } : {}),
    ...(payload.previewError !== undefined ? { preview_error: payload.previewError } : {}),
    updated_by: userId
  };
}

export async function updateComponent(
  supabase: Client,
  id: string,
  payload: UpdateComponentPayload,
  userId: string
): Promise<DesignComponent | null> {
  const { data, error } = await supabase
    .from('design_components')
    .update(toColumns(payload, userId))
    .eq('id', id)
    .select(COMPONENT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toComponent(data) : null;
}

/** Marks the preview pending for a new generation run, stamped with its request time. */
export async function requestPreview(
  supabase: Client,
  id: string,
  userId: string
): Promise<{ component: DesignComponent; requestedAt: string } | null> {
  const requestedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('design_components')
    .update({
      ...toColumns({ previewStatus: 'pending', previewError: null }, userId),
      preview_requested_at: requestedAt
    })
    .eq('id', id)
    .select(COMPONENT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { component: toComponent(data), requestedAt } : null;
}

/**
 * Saves a generation run's outcome only if no newer run was requested since, so a slow older run
 * can't overwrite a newer preview. Returns the component as stored.
 */
export async function savePreviewRun(
  supabase: Client,
  id: string,
  requestedAt: string,
  payload: UpdateComponentPayload,
  userId: string
): Promise<DesignComponent | null> {
  const { data, error } = await supabase
    .from('design_components')
    .update(toColumns(payload, userId))
    .eq('id', id)
    .eq('preview_requested_at', requestedAt)
    .select(COMPONENT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toComponent(data) : getDesignComponent(supabase, id);
}

export async function deleteComponent(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('design_components')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}
