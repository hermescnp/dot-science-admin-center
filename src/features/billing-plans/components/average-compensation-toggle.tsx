'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAverageCompensation } from './use-average-compensation';

export function AverageCompensationToggle() {
  const [on, setOn] = useAverageCompensation();
  return (
    <Tooltip>
      <TooltipTrigger
        render={<div className='flex h-9 items-center gap-2 rounded-md border px-3' />}
      >
        <Switch
          id='average-compensation'
          checked={on}
          onCheckedChange={(checked) => void setOn(checked || null)}
        />
        <Label htmlFor='average-compensation' className='cursor-pointer whitespace-nowrap'>
          Average compensation
        </Label>
      </TooltipTrigger>
      <TooltipContent className='max-w-xs'>
        Price every plan at its average use of limits instead of the full limits. Light subscribers
        compensate heavy ones, so limits can be bigger for the same cost.
      </TooltipContent>
    </Tooltip>
  );
}
