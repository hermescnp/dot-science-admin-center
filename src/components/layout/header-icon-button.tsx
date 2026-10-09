import { cn } from '@/lib/utils';

export function headerIconButtonClassName(className?: string) {
  return cn(
    'group relative flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none data-popup-open:bg-accent data-popup-open:text-foreground data-popup-open:shadow-sm [&_svg]:size-[18px]',
    className
  );
}

export const headerBadgeClassName =
  'pointer-events-none absolute top-0.5 right-0.5 z-10 flex min-h-[1.125rem] min-w-[1.125rem] translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground tabular-nums';
