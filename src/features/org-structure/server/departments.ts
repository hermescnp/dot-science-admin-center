import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Department,
  DepartmentMemberPayload,
  DepartmentPayload,
  OrgProfile,
  OrgProfilePayload
} from '../api/types';

type Client = SupabaseClient<Database>;

export class DepartmentConflictError extends Error {}
export class DepartmentInputError extends Error {}

export function departmentErrorStatus(error: unknown) {
  if (error instanceof DepartmentConflictError) return 409;
  if (error instanceof DepartmentInputError) return 400;
  return 500;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function listDepartments(supabase: Client): Promise<Department[]> {
  const { data, error } = await supabase.rpc('admin_list_org_departments');
  if (error) throw new Error(error.message);
  return data as unknown as Department[];
}

/** Rejects a parent that doesn't exist or that sits below the department itself. */
async function assertValidParent(supabase: Client, id: string | null, parentId: string | null) {
  if (!parentId) return;
  if (parentId === id) throw new DepartmentInputError('A department cannot report to itself');

  const { data, error } = await supabase.from('org_departments').select('id, parent_id');
  if (error) throw new Error(error.message);
  const parents = new Map(data.map((row) => [row.id, row.parent_id]));
  if (!parents.has(parentId)) throw new DepartmentInputError('Unknown parent department');

  for (let current: string | null = parentId; current; current = parents.get(current) ?? null) {
    if (current === id) {
      throw new DepartmentInputError(
        'A department cannot report to one of its own sub-departments'
      );
    }
  }
}

export async function createDepartment(supabase: Client, payload: DepartmentPayload) {
  await assertValidParent(supabase, null, payload.parentId);

  let siblings = supabase
    .from('org_departments')
    .select('position')
    .order('position', { ascending: false })
    .limit(1);
  siblings = payload.parentId
    ? siblings.eq('parent_id', payload.parentId)
    : siblings.is('parent_id', null);
  const { data: last, error: positionError } = await siblings.maybeSingle();
  if (positionError) throw new Error(positionError.message);

  const { error } = await supabase.from('org_departments').insert({
    id: slugify(payload.name),
    name: payload.name,
    description: payload.description,
    long_description: payload.longDescription,
    parent_id: payload.parentId,
    position: last ? last.position + 1 : 0
  });
  if (error?.code === '23505') {
    throw new DepartmentConflictError('A department with that name already exists');
  }
  if (error) throw new Error(error.message);
}

export async function updateDepartment(
  supabase: Client,
  id: string,
  payload: DepartmentPayload
): Promise<boolean> {
  await assertValidParent(supabase, id, payload.parentId);

  const { data, error } = await supabase
    .from('org_departments')
    .update({
      name: payload.name,
      description: payload.description,
      long_description: payload.longDescription,
      parent_id: payload.parentId
    })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}

/** Sub-departments move up to the deleted department's parent instead of becoming top-level. */
export async function deleteDepartment(supabase: Client, id: string): Promise<boolean> {
  const { data: department, error: readError } = await supabase
    .from('org_departments')
    .select('parent_id')
    .eq('id', id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!department) return false;

  const { error: moveError } = await supabase
    .from('org_departments')
    .update({ parent_id: department.parent_id })
    .eq('parent_id', id);
  if (moveError) throw new Error(moveError.message);

  const { error } = await supabase.from('org_departments').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

const IMAGE_BUCKET = 'department-images';
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg'
};

/** Storage path of an image URL from our bucket; null for static paths and other hosts. */
function bucketPath(supabase: Client, url: string | null) {
  if (!url) return null;
  const prefix = supabase.storage.from(IMAGE_BUCKET).getPublicUrl('').data.publicUrl;
  return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null;
}

/** A row with an `image_url`: a department or the organization profile. */
interface ImageTarget {
  folder: string;
  readImageUrl: () => Promise<{ found: boolean; imageUrl: string | null }>;
  writeImageUrl: (imageUrl: string | null) => Promise<void>;
}

function departmentImageTarget(supabase: Client, id: string): ImageTarget {
  return {
    folder: id,
    readImageUrl: async () => {
      const { data, error } = await supabase
        .from('org_departments')
        .select('image_url')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { found: !!data, imageUrl: data?.image_url ?? null };
    },
    writeImageUrl: async (imageUrl) => {
      const { error } = await supabase
        .from('org_departments')
        .update({ image_url: imageUrl })
        .eq('id', id);
      if (error) throw new Error(error.message);
    }
  };
}

// Department ids are slugs, so the underscore keeps this folder from colliding with one.
function profileImageTarget(supabase: Client): ImageTarget {
  return {
    folder: '_organization',
    readImageUrl: async () => {
      const { data, error } = await supabase
        .from('org_profile')
        .select('image_url')
        .eq('id', true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { found: !!data, imageUrl: data?.image_url ?? null };
    },
    writeImageUrl: async (imageUrl) => {
      const { error } = await supabase
        .from('org_profile')
        .update({ image_url: imageUrl })
        .eq('id', true);
      if (error) throw new Error(error.message);
    }
  };
}

async function replaceImage(
  supabase: Client,
  target: ImageTarget,
  imageUrl: string | null
): Promise<boolean> {
  const current = await target.readImageUrl();
  if (!current.found) return false;

  await target.writeImageUrl(imageUrl);
  const previous = bucketPath(supabase, current.imageUrl);
  if (previous) await supabase.storage.from(IMAGE_BUCKET).remove([previous]);
  return true;
}

async function uploadImage(supabase: Client, target: ImageTarget, file: File): Promise<boolean> {
  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) throw new DepartmentInputError('Unsupported image type');

  const path = `${target.folder}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);

  const { publicUrl } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data;
  const updated = await replaceImage(supabase, target, publicUrl);
  if (!updated) await supabase.storage.from(IMAGE_BUCKET).remove([path]);
  return updated;
}

export function setDepartmentImage(supabase: Client, id: string, file: File) {
  return uploadImage(supabase, departmentImageTarget(supabase, id), file);
}

export function clearDepartmentImage(supabase: Client, id: string) {
  return replaceImage(supabase, departmentImageTarget(supabase, id), null);
}

export async function getOrgProfile(supabase: Client): Promise<OrgProfile> {
  const { data, error } = await supabase
    .from('org_profile')
    .select('image_url, long_description, zone_key')
    .eq('id', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    imageUrl: data?.image_url ?? null,
    longDescription: data?.long_description ?? '',
    zoneKey: data?.zone_key ?? null
  };
}

export async function updateOrgProfile(supabase: Client, payload: OrgProfilePayload) {
  const { error } = await supabase
    .from('org_profile')
    .upsert({ id: true, long_description: payload.longDescription });
  if (error) throw new Error(error.message);
}

export function setOrgProfileImage(supabase: Client, file: File) {
  return uploadImage(supabase, profileImageTarget(supabase), file);
}

export function clearOrgProfileImage(supabase: Client) {
  return replaceImage(supabase, profileImageTarget(supabase), null);
}

export async function addDepartmentMember(
  supabase: Client,
  departmentId: string,
  payload: DepartmentMemberPayload
) {
  const { error } = await supabase.from('org_department_members').insert({
    department_id: departmentId,
    user_id: payload.kind === 'user' ? payload.refId : null,
    agent_id: payload.kind === 'agent' ? payload.refId : null,
    role: payload.role
  });
  if (error?.code === '23505') {
    throw new DepartmentConflictError('Already a member of this department');
  }
  if (error?.code === '23503') {
    throw new DepartmentInputError('Unknown department, user or agent');
  }
  if (error) throw new Error(error.message);
}

export async function removeDepartmentMember(
  supabase: Client,
  departmentId: string,
  memberId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('org_department_members')
    .delete()
    .eq('department_id', departmentId)
    .eq('id', memberId)
    .select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}
