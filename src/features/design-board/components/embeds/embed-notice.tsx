import type { ReactNode } from 'react';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Stands in for a design embed that can't be shown, e.g. because it was deleted. */
export function EmbedNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'text-muted-foreground bg-muted/30 flex min-h-24 items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center text-sm',
        className
      )}
    >
      <Icons.photo className='size-4 shrink-0' />
      <span>{children}</span>
    </div>
  );
}

export function EmbedLoading({ className }: { className?: string }) {
  return <Skeleton aria-busy='true' className={cn('h-40 w-full rounded-lg', className)} />;
}
