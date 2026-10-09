'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function NotApplicable({ reason }: { reason: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span aria-label={reason} className='text-muted-foreground cursor-help' />}
      >
        —
      </TooltipTrigger>
      <TooltipContent side='top'>{reason}</TooltipContent>
    </Tooltip>
  );
}
