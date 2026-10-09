import { Skeleton } from '@/components/ui/skeleton';

export function AgentGridSkeleton() {
  return (
    <div className='flex flex-col gap-3'>
      <Skeleton className='h-5 w-40' />
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className='h-[26rem] rounded-xl' />
        ))}
      </div>
    </div>
  );
}
