import { queryOptions } from '@tanstack/react-query';
import { getUsers } from './service';
import { userSortKeys, type UserFilters, type UserSortKey } from './types';

export const userKeys = {
  all: ['users'] as const,
  list: (filters: UserFilters) => [...userKeys.all, 'list', filters] as const
};

const sortKeysByColumn: Record<string, UserSortKey> = {
  user: 'name',
  lastSignIn: 'last_sign_in',
  lastSeen: 'last_seen'
};

/** Builds table filters from URL params; shared by the server prefetch and the client table. */
export function toUserFilters(params: {
  page: number;
  perPage: number;
  user: string | null;
  admin: string[];
  plan: string[];
  sort: { id: string; desc: boolean }[];
}): UserFilters {
  const [admin] = params.admin;
  const [plan] = params.plan;
  const sortKey = params.sort[0] ? sortKeysByColumn[params.sort[0].id] : undefined;
  return {
    page: params.page,
    limit: params.perPage,
    ...(params.user && { search: params.user }),
    ...(admin && { admin: admin === 'admin' }),
    ...(plan && { plan }),
    ...(sortKey &&
      userSortKeys.includes(sortKey) && {
        sort: `${sortKey}.${params.sort[0].desc ? 'desc' : 'asc'}` as const
      })
  };
}

export const usersQueryOptions = (filters: UserFilters) =>
  queryOptions({
    queryKey: userKeys.list(filters),
    queryFn: () => getUsers(filters)
  });
