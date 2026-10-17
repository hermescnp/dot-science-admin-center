import 'server-only';

import type { Database, Json } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateLayerPayload,
  DesignLayer,
  DesignSection,
  InterfaceScreen,
  ScenePayload,
  SectionTitlePayload,
  UpdateLayerPayload
} from '../api/types';

type Client = SupabaseClient<Database>;
type LayerRow = Database['public']['Tables']['design_layers']['Row'];
type SectionRow = Database['public']['Tables']['design_sections']['Row'];

const SECTION_COLUMNS = 'id, title, position, files, updated_at' as const;
const LAYER_COLUMNS = 'id, section_id, title, position, elements, screen, updated_at' as const;

function isObject(value: Json | null): value is { [key: string]: Json | undefined } {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toLayer(
  row: Pick<
    LayerRow,
    'id' | 'section_id' | 'title' | 'position' | 'elements' | 'screen' | 'updated_at'
  >
): DesignLayer {
  return {
    id: row.id,
    sectionId: row.section_id,
    title: row.title,
    position: row.position,
    elements: Array.isArray(row.elements) ? row.elements : [],
    screen: isObject(row.screen) ? (row.screen as unknown as InterfaceScreen) : null,
    updatedAt: row.updated_at
  };
}

function toSection(
  row: Pick<SectionRow, 'id' | 'title' | 'position' | 'files' | 'updated_at'>,
  layers: DesignLayer[]
): DesignSection {
  return {
    id: row.id,
    title: row.title,
    position: row.position,
    files: isObject(row.files) ? row.files : {},
    layers,
    updatedAt: row.updated_at
  };
}

export async function getDesignSections(supabase: Client): Promise<DesignSection[]> {
  const [sections, layers] = await Promise.all([
    supabase.from('design_sections').select(SECTION_COLUMNS).order('position'),
    supabase.from('design_layers').select(LAYER_COLUMNS).order('position')
  ]);
  if (sections.error) throw new Error(sections.error.message);
  if (layers.error) throw new Error(layers.error.message);

  const bySection = new Map<string, DesignLayer[]>();
  for (const row of layers.data) {
    const list = bySection.get(row.section_id) ?? [];
    list.push(toLayer(row));
    bySection.set(row.section_id, list);
  }
  return sections.data.map((row) => toSection(row, bySection.get(row.id) ?? []));
}

async function nextSectionPosition(supabase: Client): Promise<number> {
  const { data, error } = await supabase
    .from('design_sections')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.position ?? -1) + 1;
}

async function nextLayerPosition(supabase: Client, sectionId: string): Promise<number> {
  const { data, error } = await supabase
    .from('design_layers')
    .select('position')
    .eq('section_id', sectionId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.position ?? -1) + 1;
}

export async function createSection(
  supabase: Client,
  payload: SectionTitlePayload
): Promise<DesignSection> {
  const position = await nextSectionPosition(supabase);
  const { data, error } = await supabase
    .from('design_sections')
    .insert({ title: payload.title, position })
    .select(SECTION_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  const layer = await createLayer(supabase, { sectionId: data.id, title: 'Layer 1' });
  return toSection(data, [layer]);
}

export async function renameSection(
  supabase: Client,
  id: string,
  payload: SectionTitlePayload
): Promise<boolean> {
  const { data, error } = await supabase
    .from('design_sections')
    .update({ title: payload.title })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}

export async function deleteSection(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase.from('design_sections').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}

export async function createLayer(
  supabase: Client,
  payload: CreateLayerPayload
): Promise<DesignLayer> {
  const position = await nextLayerPosition(supabase, payload.sectionId);
  const { data, error } = await supabase
    .from('design_layers')
    .insert({
      section_id: payload.sectionId,
      title: payload.title,
      position,
      ...(payload.screen ? { screen: payload.screen as unknown as Json } : {})
    })
    .select(LAYER_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toLayer(data);
}

export async function updateLayer(
  supabase: Client,
  id: string,
  payload: UpdateLayerPayload,
  userId: string
): Promise<DesignLayer | null> {
  const { data, error } = await supabase
    .from('design_layers')
    .update({
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.screen !== undefined ? { screen: payload.screen as unknown as Json } : {}),
      updated_by: userId
    })
    .eq('id', id)
    .select(LAYER_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toLayer(data) : null;
}

export async function deleteLayer(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase.from('design_layers').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}

/** Writes the canvas: each listed layer's elements plus the section's shared files. */
export async function saveSectionScene(
  supabase: Client,
  sectionId: string,
  scene: ScenePayload,
  userId: string
): Promise<{ updatedAt: string } | null> {
  const section = await supabase
    .from('design_sections')
    .update({ files: scene.files as Json })
    .eq('id', sectionId)
    .select('updated_at')
    .maybeSingle();
  if (section.error) throw new Error(section.error.message);
  if (!section.data) return null;

  const results = await Promise.all(
    Object.entries(scene.layers).map(([layerId, elements]) =>
      supabase
        .from('design_layers')
        .update({ elements: elements as Json, updated_by: userId })
        .eq('id', layerId)
        .eq('section_id', sectionId)
    )
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);

  return { updatedAt: section.data.updated_at };
}
