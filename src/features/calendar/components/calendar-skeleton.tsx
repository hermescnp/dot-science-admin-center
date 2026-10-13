import { Skeleton } from '@/components/ui/skeleton';

export function CalendarSkeleton() {
  return (
    <div role='status' aria-label='Loading calendar' className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <Skeleton className='h-9 w-16' />
          <Skeleton className='h-9 w-20' />
          <Skeleton className='h-7 w-44' />
        </div>
        <Skeleton className='h-9 w-28' />
      </div>
      <Skeleton className='h-[calc(100dvh-13rem)] min-h-[520px] w-full rounded-xl' />
    </div>
  );
}
