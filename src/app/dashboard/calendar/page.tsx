import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { calendarKeys, resolveWeek, weekFetchRange } from '@/features/calendar/api/queries';
import { CalendarSkeleton } from '@/features/calendar/components/calendar-skeleton';
import { CalendarWeekView } from '@/features/calendar/components/calendar-week-view';
import { listEvents } from '@/features/calendar/server/events';
import { getSupabaseServerClient } from '@/lib/auth-server';
import { getQueryClient } from '@/lib/query-client';

export const metadata = {
  title: 'Dashboard: Calendar'
};

type PageProps = {
  searchParams: Promise<{ week?: string | string[] }>;
};

export default async function CalendarPage(props: PageProps) {
  const { week: weekParam } = await props.searchParams;
  const week = resolveWeek(typeof weekParam === 'string' ? weekParam : null);

  const queryClient = getQueryClient();
  // The client's queryFn goes through /api, which a server component can't call with a relative URL.
  void queryClient.prefetchQuery({
    queryKey: calendarKeys.week(week),
    queryFn: async () => listEvents(await getSupabaseServerClient(), weekFetchRange(week))
  });

  return (
    <PageContainer pageTitle='Calendar' pageDescription='Team events and schedule'>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarWeekView />
        </Suspense>
      </HydrationBoundary>
    </PageContainer>
  );
}
