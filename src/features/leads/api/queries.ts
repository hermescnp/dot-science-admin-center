import { queryOptions } from '@tanstack/react-query';
import { getLeads } from './service';
import {
  leadEmailStatuses,
  leadSources,
  leadStatuses,
  type LeadEmailStatus,
  type LeadFilters,
  type LeadSortKey,
  type LeadSource,
  type LeadStatus
} from './types';

export const leadKeys = {
  all: ['leads'] as const,
  list: (filters: LeadFilters) => [...leadKeys.all, 'list', filters] as const
};

const sortKeysByColumn: Record<string, LeadSortKey> = {
  lead: 'name',
  status: 'status',
  firstCaptured: 'first_captured',
  lastCaptured: 'last_captured'
};

/** Builds table filters from URL params; shared by the server prefetch and the client table. */
export function toLeadFilters(params: {
  page: number;
  perPage: number;
  lead: string | null;
  email: string[];
  status: string[];
  source: string[];
  sort: { id: string; desc: boolean }[];
}): LeadFilters {
  const statuses = params.status.filter((value): value is LeadStatus =>
    (leadStatuses as readonly string[]).includes(value)
  );
  const sources = params.source.filter((value): value is LeadSource =>
    (leadSources as readonly string[]).includes(value)
  );
  const emailStatuses = params.email.filter((value): value is LeadEmailStatus =>
    (leadEmailStatuses as readonly string[]).includes(value)
  );
  const sortKey = params.sort[0] ? sortKeysByColumn[params.sort[0].id] : undefined;
  return {
    page: params.page,
    limit: params.perPage,
    ...(params.lead && { search: params.lead }),
    ...(statuses.length > 0 && { statuses }),
    ...(sources.length > 0 && { sources }),
    ...(emailStatuses.length > 0 && { emailStatuses }),
    ...(sortKey && { sort: `${sortKey}.${params.sort[0].desc ? 'desc' : 'asc'}` as const })
  };
}

export const leadsQueryOptions = (filters: LeadFilters) =>
  queryOptions({
    queryKey: leadKeys.list(filters),
    queryFn: () => getLeads(filters)
  });
