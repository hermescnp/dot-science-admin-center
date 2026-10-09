import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString
} from 'nuqs/server';
import { getSortingStateParser } from '@/lib/parsers';
import { platformFeaturesPageSize } from './pagination';

// Must match the parsers useDataTable registers for the same keys, since nuqs shares parsed values between hooks.
export const platformFeaturesSearchParams = {
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(platformFeaturesPageSize),
  name: parseAsString,
  platform: parseAsArrayOf(parseAsString, ',').withDefault([]),
  section: parseAsArrayOf(parseAsString, ',').withDefault([]),
  status: parseAsArrayOf(parseAsString, ',').withDefault([]),
  sort: getSortingStateParser(['name', 'platform', 'section', 'status']).withDefault([])
};

export const platformFeaturesSearchParamsCache = createSearchParamsCache(
  platformFeaturesSearchParams
);
