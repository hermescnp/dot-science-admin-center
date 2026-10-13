import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { KNOWLEDGE_IMAGE_TYPES, type KnowledgeImage } from '../api/types';

type Client = SupabaseClient<Database>;

const BUCKET = 'knowledge-images';

function fileStem(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  );
}

/** Stored names are `<timestamp>-<stem>.<ext>`; the stem doubles as the image's alt text. */
function toImage(supabase: Client, name: string, createdAt: string | null): KnowledgeImage {
  return {
    name,
    alt: name
      .replace(/^\d+-/, '')
      .replace(/\.[^.]+$/, '')
      .replace(/-/g, ' '),
    url: supabase.storage.from(BUCKET).getPublicUrl(name).data.publicUrl,
    createdAt
  };
}

export async function listKnowledgeImages(supabase: Client): Promise<KnowledgeImage[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) throw new Error(error.message);
  return data
    .filter((file) => file.id !== null)
    .map((file) => toImage(supabase, file.name, file.created_at));
}

export async function uploadKnowledgeImage(supabase: Client, file: File): Promise<KnowledgeImage> {
  const extension = KNOWLEDGE_IMAGE_TYPES[file.type];
  const name = `${Date.now()}-${fileStem(file.name)}.${extension}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(name, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return toImage(supabase, name, new Date().toISOString());
}
