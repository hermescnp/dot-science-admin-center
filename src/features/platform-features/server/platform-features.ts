import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PlatformFeature,
  PlatformFeatureFilters,
  PlatformFeatureMutationPayload,
  PlatformFeatureSection,
  PlatformFeatureStatus,
  PlatformFeaturesResponse
} from '../api/types';

type Client = SupabaseClient<Database>;
type PlatformFeatureRow = Omit<
  Database['public']['Tables']['platform_features']['Row'],
  'created_at' | 'updated_by'
>;

const COLUMNS =
  'id, platform_id, section, slug, icon, name, description, services, status, position, updated_at';

const sortColumns: Record<string, keyof PlatformFeatureRow> = {
  platform: 'platform_id',
  section: 'section',
  status: 'status',
  name: 'name'
};

export class PlatformFeatureConflictError extends Error {}

function toPlatformFeature(row: PlatformFeatureRow): PlatformFeature {
  return {
    id: row.id,
    platformId: row.platform_id,
    section: row.section as PlatformFeatureSection,
    slug: row.slug,
    icon: row.icon,
    name: row.name,
    description: row.description,
    services: row.services,
    status: row.status as PlatformFeatureStatus,
    position: row.position,
    updatedAt: row.updated_at
  };
}

function parseSort(sort: string | undefined): { id: string; desc: boolean }[] {
  if (!sort) return [];
  try {
    const parsed: unknown = JSON.parse(sort);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is { id: string; desc: boolean } =>
            typeof item?.id === 'string' && item.id in sortColumns
        )
      : [];
  } catch {
    return [];
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function listPlatformFeatures(
  supabase: Client,
  filters: PlatformFeatureFilters
): Promise<PlatformFeaturesResponse> {
  let query = supabase.from('platform_features').select(COLUMNS, { count: 'exact' });

  if (filters.platforms?.length) query = query.in('platform_id', filters.platforms);
  if (filters.sections?.length) query = query.in('section', filters.sections);
  if (filters.statuses?.length) query = query.in('status', filters.statuses);
  if (filters.search) {
    // Characters that would break the PostgREST `or` filter syntax or act as wildcards.
    const term = filters.search.replace(/[%,()*\\]/g, ' ').trim();
    if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const sort = parseSort(filters.sort);
  for (const item of sort) {
    query = query.order(sortColumns[item.id], { ascending: !item.desc });
  }
  if (!sort.length) query = query.order('platform_id').order('section');
  query = query.order('position').order('name');

  const from = (filters.page - 1) * filters.limit;
  const { data, error, count } = await query.range(from, from + filters.limit - 1);
  if (error) throw new Error(error.message);

  return { features: data.map(toPlatformFeature), total: count ?? 0 };
}

export async function listFeaturesForPlatform(
  supabase: Client,
  platformId: string
): Promise<PlatformFeature[]> {
  const { data, error } = await supabase
    .from('platform_features')
    .select(COLUMNS)
    .eq('platform_id', platformId)
    .order('position')
    .order('name');
  if (error) throw new Error(error.message);
  return data.map(toPlatformFeature);
}

export async function createPlatformFeature(
  supabase: Client,
  payload: PlatformFeatureMutationPayload
): Promise<PlatformFeature> {
  const { data: last, error: positionError } = await supabase
    .from('platform_features')
    .select('position')
    .eq('platform_id', payload.platformId)
    .eq('section', payload.section)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (positionError) throw new Error(positionError.message);

  const { data, error } = await supabase
    .from('platform_features')
    .insert({
      platform_id: payload.platformId,
      section: payload.section,
      slug: slugify(payload.name),
      icon: payload.icon,
      name: payload.name,
      description: payload.description,
      services: payload.services,
      status: payload.status,
      position: last ? last.position + 1 : 0
    })
    .select(COLUMNS)
    .single();
  if (error?.code === '23505') {
    throw new PlatformFeatureConflictError('This platform already has a feature with that name');
  }
  if (error) throw new Error(error.message);
  return toPlatformFeature(data);
}

export async function updatePlatformFeature(
  supabase: Client,
  id: string,
  payload: PlatformFeatureMutationPayload
): Promise<PlatformFeature | null> {
  const { data, error } = await supabase
    .from('platform_features')
    .update({
      platform_id: payload.platformId,
      section: payload.section,
      icon: payload.icon,
      name: payload.name,
      description: payload.description,
      services: payload.services,
      status: payload.status
    })
    .eq('id', id)
    .select(COLUMNS)
    .maybeSingle();
  if (error?.code === '23505') {
    throw new PlatformFeatureConflictError(
      'The selected platform already has a feature with this slug'
    );
  }
  if (error) throw new Error(error.message);
  return data ? toPlatformFeature(data) : null;
}

export async function deletePlatformFeature(supabase: Client, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('platform_features')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}
