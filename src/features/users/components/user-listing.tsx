import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { billingPlanKeys } from '@/features/billing-plans/api/queries';
import { listBillingPlans } from '@/features/billing-plans/server/billing-plans';
import { getSupabaseServerClient } from '@/lib/auth-server';
import { getQueryClient } from '@/lib/query-client';
import { toUserFilters, userKeys } from '../api/queries';
import { usersSearchParamsCache } from '../constants/search-params';
import { listUsers } from '../server/users';
import { UsersTable } from './users-table';

export default function UserListingPage() {
  const filters = toUserFilters({
    page: usersSearchParamsCache.get('page'),
    perPage: usersSearchParamsCache.get('perPage'),
    user: usersSearchParamsCache.get('user'),
    admin: usersSearchParamsCache.get('admin'),
    plan: usersSearchParamsCache.get('plan'),
    sort: usersSearchParamsCache.get('sort')
  });

  const queryClient = getQueryClient();

  // The client's queryFns go through /api, which a server component can't call with a relative URL.
  void queryClient.prefetchQuery({
    queryKey: userKeys.list(filters),
    queryFn: async () => listUsers(await getSupabaseServerClient(), filters)
  });
  void queryClient.prefetchQuery({
    queryKey: billingPlanKeys.list(),
    queryFn: async () => listBillingPlans(await getSupabaseServerClient())
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UsersTable />
    </HydrationBoundary>
  );
}
