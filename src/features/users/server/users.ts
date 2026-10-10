import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlatformUser, UserFilters, UserUpdatePayload, UsersResponse } from '../api/types';

type Client = SupabaseClient<Database>;

export class UserForbiddenError extends Error {}

function rpcError(error: { code?: string; message: string }) {
  return error.code === '42501' ? new UserForbiddenError(error.message) : new Error(error.message);
}

export async function listUsers(supabase: Client, filters: UserFilters): Promise<UsersResponse> {
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_search: filters.search,
    p_admin: filters.admin,
    p_plan: filters.plan,
    p_sort: filters.sort,
    p_limit: filters.limit,
    p_offset: (filters.page - 1) * filters.limit
  });
  if (error) throw rpcError(error);
  return data as unknown as UsersResponse;
}

export async function updateUser(
  supabase: Client,
  id: string,
  payload: UserUpdatePayload
): Promise<PlatformUser | null> {
  const { data, error } = await supabase.rpc('admin_update_user', {
    p_user_id: id,
    p_display_name: payload.displayName,
    p_is_platform_admin: payload.isPlatformAdmin,
    p_billing_plan_id: payload.billingPlanId
  });
  if (error?.code === '23503') throw new Error('That billing plan no longer exists');
  if (error) throw rpcError(error);
  return data as unknown as PlatformUser | null;
}
