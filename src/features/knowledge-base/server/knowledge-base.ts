import 'server-only';

import {
  isValidSectionContentJson,
  markdownToSectionContentJson,
  reconcileBlockIdComments,
  type SectionContentJson
} from '@hermescnp/content-blocks';
import type { Database, Json } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateLayerPayload,
  CreateSectionPayload,
  KnowledgeBase,
  KnowledgeLayer,
  KnowledgeSection,
  UpdateLayerPayload
} from '../api/types';

type Client = SupabaseClient<Database>;
type LayerRow = Database['public']['Tables']['knowledge_layers']['Row'];

const LAYER_COLUMNS =
  'id, section_id, slug, title, summary, content, content_json, position, updated_at, updated_by' as const;

interface LayerBlocks {
  content: string;
  contentJson: SectionContentJson;
}

/**
 * Gives every top-level block of `markdown` a persistent id: ids already in the markdown are
 * kept, the rest are matched by content against `previousContent` so edits never shift ids.
 */
function annotateLayerContent(
  id: string,
  title: string,
  previousContent: string,
  markdown: string
): LayerBlocks {
  const content = reconcileBlockIdComments(previousContent, markdown);
  return {
    content,
    contentJson: markdownToSectionContentJson({ sectionId: id, title, markdown: content })
  };
}

function layerBlocksColumns({ content, contentJson }: LayerBlocks) {
  return { content, content_json: contentJson as unknown as Json };
}

function toLayer(row: Omit<LayerRow, 'created_at'>, names: Map<string, string>): KnowledgeLayer {
  const contentJson = isValidSectionContentJson(row.content_json, row.id)
    ? row.content_json
    : annotateLayerContent(row.id, row.title, row.content, row.content).contentJson;
  return {
    id: row.id,
    sectionId: row.section_id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    content: row.content,
    contentJson,
    position: row.position,
    updatedAt: row.updated_at,
    updatedByName: row.updated_by ? (names.get(row.updated_by) ?? null) : null
  };
}

async function displayNames(supabase: Client, userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();
  const { data } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', unique);
  return new Map(
    (data ?? []).flatMap((p) => (p.display_name ? [[p.user_id, p.display_name] as const] : []))
  );
}

export async function getKnowledgeBase(supabase: Client): Promise<KnowledgeBase> {
  const [sectionsResult, layersResult] = await Promise.all([
    supabase.from('knowledge_sections').select('id, title, position').order('position'),
    supabase.from('knowledge_layers').select(LAYER_COLUMNS).order('position')
  ]);
  if (sectionsResult.error) throw new Error(sectionsResult.error.message);
  if (layersResult.error) throw new Error(layersResult.error.message);

  const layerRows = await Promise.all(layersResult.data.map((row) => withBlockIds(supabase, row)));
  const names = await displayNames(
    supabase,
    layerRows.flatMap((row) => (row.updated_by ? [row.updated_by] : []))
  );

  const sections: KnowledgeSection[] = sectionsResult.data.map((section) => ({
    ...section,
    layers: []
  }));
  const byId = new Map(sections.map((section) => [section.id, section]));
  for (const row of layerRows) byId.get(row.section_id)?.layers.push(toLayer(row, names));
  return { sections };
}

/** Layers written before block identity existed get their ids once, on first read. */
async function withBlockIds(
  supabase: Client,
  row: Omit<LayerRow, 'created_at'>
): Promise<Omit<LayerRow, 'created_at'>> {
  if (row.content_json !== null) return row;
  const columns = layerBlocksColumns(annotateLayerContent(row.id, row.title, '', row.content));
  const { error } = await supabase
    .from('knowledge_layers')
    .update(columns)
    .eq('id', row.id)
    .is('content_json', null);
  if (error) throw new Error(error.message);
  return { ...row, ...columns };
}

function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return slug || 'layer';
}

async function uniqueSlug(supabase: Client, title: string): Promise<string> {
  const base = slugify(title);
  const { data, error } = await supabase
    .from('knowledge_layers')
    .select('slug')
    .like('slug', `${base}%`);
  if (error) throw new Error(error.message);
  const taken = new Set(data.map((row) => row.slug));
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

async function nextPosition(
  supabase: Client,
  table: 'knowledge_layers' | 'knowledge_sections',
  sectionId?: string
): Promise<number> {
  const { data, error } =
    table === 'knowledge_layers'
      ? await supabase
          .from(table)
          .select('position')
          .eq('section_id', sectionId!)
          .order('position', { ascending: false })
          .limit(1)
      : await supabase
          .from(table)
          .select('position')
          .order('position', { ascending: false })
          .limit(1);
  if (error) throw new Error(error.message);
  return (data[0]?.position ?? -1) + 1;
}

async function withName(supabase: Client, row: Omit<LayerRow, 'created_at'>) {
  return toLayer(row, await displayNames(supabase, row.updated_by ? [row.updated_by] : []));
}

export async function createLayer(
  supabase: Client,
  payload: CreateLayerPayload
): Promise<KnowledgeLayer> {
  const [slug, position] = await Promise.all([
    uniqueSlug(supabase, payload.title),
    nextPosition(supabase, 'knowledge_layers', payload.sectionId)
  ]);
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from('knowledge_layers')
    .insert({
      id,
      section_id: payload.sectionId,
      slug,
      title: payload.title,
      summary: payload.summary || null,
      ...layerBlocksColumns(annotateLayerContent(id, payload.title, '', payload.content)),
      position
    })
    .select(LAYER_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return withName(supabase, data);
}

export async function updateLayer(
  supabase: Client,
  id: string,
  payload: UpdateLayerPayload,
  userId: string
): Promise<KnowledgeLayer | null> {
  const { data: current, error: currentError } = await supabase
    .from('knowledge_layers')
    .select('section_id, title, content')
    .eq('id', id)
    .maybeSingle();
  if (currentError) throw new Error(currentError.message);
  if (!current) return null;

  const moved = payload.sectionId !== undefined && payload.sectionId !== current.section_id;
  const blocksChanged = payload.title !== undefined || payload.content !== undefined;
  const blocks =
    blocksChanged &&
    annotateLayerContent(
      id,
      payload.title ?? current.title,
      current.content,
      payload.content ?? current.content
    );
  const { data, error } = await supabase
    .from('knowledge_layers')
    .update({
      ...(payload.title !== undefined && { title: payload.title }),
      ...(payload.summary !== undefined && { summary: payload.summary || null }),
      ...(blocks && layerBlocksColumns(blocks)),
      ...(moved && {
        section_id: payload.sectionId,
        position: await nextPosition(supabase, 'knowledge_layers', payload.sectionId)
      }),
      updated_by: userId
    })
    .eq('id', id)
    .select(LAYER_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return withName(supabase, data);
}

export async function deleteLayer(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('knowledge_layers')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}

export async function createSection(
  supabase: Client,
  payload: CreateSectionPayload
): Promise<Omit<KnowledgeSection, 'layers'>> {
  const position = await nextPosition(supabase, 'knowledge_sections');
  const { data, error } = await supabase
    .from('knowledge_sections')
    .insert({ title: payload.title, position })
    .select('id, title, position')
    .single();
  if (error) throw new Error(error.message);
  return data;
}
