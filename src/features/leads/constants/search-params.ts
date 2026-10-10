import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString
} from 'nuqs/server';
import { getSortingStateParser } from '@/lib/parsers';

// Must match the parsers useDataTable registers for the same keys, since nuqs shares parsed values between hooks.
export const leadsSearchParams = {
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  lead: parseAsString,
  email: parseAsArrayOf(parseAsString, ',').withDefault([]),
  status: parseAsArrayOf(parseAsString, ',').withDefault([]),
  source: parseAsArrayOf(parseAsString, ',').withDefault([]),
  sort: getSortingStateParser(['lead', 'status', 'firstCaptured', 'lastCaptured']).withDefault([])
};

export const leadsSearchParamsCache = createSearchParamsCache(leadsSearchParams);
