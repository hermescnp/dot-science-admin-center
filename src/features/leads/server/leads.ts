import 'server-only';

import type { Database } from '@hermescnp/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LeadFilters, LeadUpdatePayload, LeadsResponse } from '../api/types';

type Client = SupabaseClient<Database>;

export class LeadForbiddenError extends Error {}

export async function listLeads(supabase: Client, filters: LeadFilters): Promise<LeadsResponse> {
  const { data, error } = await supabase.rpc('admin_list_leads', {
    p_search: filters.search,
    p_status: filters.statuses,
    p_source: filters.sources,
    p_email_status: filters.emailStatuses,
    p_sort: filters.sort,
    p_limit: filters.limit,
    p_offset: (filters.page - 1) * filters.limit
  });
  if (error?.code === '42501') throw new LeadForbiddenError(error.message);
  if (error) throw new Error(error.message);
  return data as unknown as LeadsResponse;
}

/** Returns false when no row matched, which RLS also produces for non-admins. */
export async function updateLead(
  supabase: Client,
  id: string,
  payload: LeadUpdatePayload
): Promise<boolean> {
  const { data, error } = await supabase
    .from('leads')
    .update({ status: payload.status, notes: payload.notes })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  return data.length > 0;
}
