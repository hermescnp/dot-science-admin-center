import { Icons } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { headerIconButtonClassName } from './header-icon-button';

export default function CtaGithub() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <a
            aria-label='View on GitHub'
            href='https://github.com/Kiranism/next-shadcn-dashboard-starter'
            rel='noopener noreferrer'
            target='_blank'
            className={headerIconButtonClassName('hidden sm:flex')}
          />
        }
      >
        <Icons.github stroke={1.5} />
      </TooltipTrigger>
      <TooltipContent side='bottom'>View on GitHub</TooltipContent>
    </Tooltip>
  );
}
