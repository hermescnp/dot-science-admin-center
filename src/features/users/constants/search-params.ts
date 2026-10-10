import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString
} from 'nuqs/server';
import { getSortingStateParser } from '@/lib/parsers';

// Must match the parsers useDataTable registers for the same keys, since nuqs shares parsed values between hooks.
export const usersSearchParams = {
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  user: parseAsString,
  admin: parseAsArrayOf(parseAsString, ',').withDefault([]),
  plan: parseAsArrayOf(parseAsString, ',').withDefault([]),
  sort: getSortingStateParser(['user', 'lastSignIn', 'lastSeen']).withDefault([])
};

export const usersSearchParamsCache = createSearchParamsCache(usersSearchParams);
