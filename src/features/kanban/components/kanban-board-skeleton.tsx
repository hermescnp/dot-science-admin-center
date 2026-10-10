import { Skeleton } from '@/components/ui/skeleton';

export function KanbanBoardSkeleton() {
  return (
    <div className='flex flex-col gap-4'>
      <Skeleton className='h-9 w-56' />
      <div className='flex flex-col gap-4 md:flex-row'>
        {Array.from({ length: 4 }, (_, column) => (
          <div key={column} className='flex w-full flex-col gap-2 md:w-[320px]'>
            <Skeleton className='h-6 w-32' />
            {Array.from({ length: 4 }, (_, card) => (
              <Skeleton key={card} className='h-24 rounded-md' />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
