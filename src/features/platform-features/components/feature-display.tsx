import { Icons, type Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import { cn } from '@/lib/utils';
import type { PlatformFeatureStatus } from '../api/types';
import { platformFeatureStatusesByValue, serviceNodesById } from '../constants/options';
import { costUnits, estimateFeatureCost, formatCost } from '../constants/usage-costs';

export function featureIcon(icon: string): Icon {
  return Object.hasOwn(Icons, icon) ? Icons[icon as keyof typeof Icons] : Icons.circleDashed;
}

export function FeatureIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = featureIcon(icon);
  return (
    <div
      className={cn(
        'bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg',
        className
      )}
    >
      <Icon className='size-4' stroke={1.5} />
    </div>
  );
}

export function FeatureStatusBadge({
  status,
  className
}: {
  status: PlatformFeatureStatus;
  className?: string;
}) {
  const option = platformFeatureStatusesByValue.get(status);
  if (!option) return null;
  const StatusIcon = option.icon;
  return (
    <Badge variant='outline' className={cn('gap-1 font-normal', option.className, className)}>
      <StatusIcon className='size-3' />
      {option.label}
    </Badge>
  );
}

export function ServiceBadges({ services, className }: { services: string[]; className?: string }) {
  if (!services.length) return null;
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {services.map((serviceId) => {
        const service = serviceNodesById.get(serviceId);
        if (!service) return null;
        return (
          <Badge key={serviceId} variant='outline' className='gap-1.5 font-normal'>
            {service.data.logo ? (
              <BrandLogo logo={service.data.logo} logoDark={service.data.logoDark} size={14} />
            ) : null}
            {service.data.label}
          </Badge>
        );
      })}
    </div>
  );
}

export function FeatureCost({ services }: { services: string[] }) {
  const estimate = estimateFeatureCost(services);
  if (!estimate) return <span className='text-muted-foreground text-sm'>n/a</span>;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className='flex cursor-help flex-col gap-0.5 text-sm font-medium tabular-nums' />
        }
      >
        {costUnits.map((unit) => {
          const total = estimate.totals[unit];
          return total === undefined ? null : (
            <span key={unit} className='underline decoration-dotted underline-offset-4'>
              ~{formatCost(total, unit)}
            </span>
          );
        })}
      </TooltipTrigger>
      <TooltipContent side='left' className='max-w-xs'>
        <div className='flex flex-col gap-1.5 py-0.5'>
          {estimate.items.map((item) => (
            <div key={item.serviceId} className='flex items-start justify-between gap-4'>
              <div>
                <div className='font-medium'>
                  {serviceNodesById.get(item.serviceId)?.data.label ?? item.serviceId}
                </div>
                <div className='opacity-70'>{item.usage}</div>
              </div>
              <span className='whitespace-nowrap tabular-nums'>
                {formatCost(item.cost, item.unit)}
              </span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
