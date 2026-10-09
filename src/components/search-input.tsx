'use client';
import { useKBar } from 'kbar';
import { Icons } from '@/components/icons';
import { headerIconButtonClassName } from '@/components/layout/header-icon-button';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function SearchInput() {
  const { query } = useKBar();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type='button'
            aria-label='Search'
            className={headerIconButtonClassName()}
            onClick={query.toggle}
          />
        }
      >
        <Icons.search stroke={1.5} />
      </TooltipTrigger>
      <TooltipContent side='bottom'>
        Search <Kbd>⌘K</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}
