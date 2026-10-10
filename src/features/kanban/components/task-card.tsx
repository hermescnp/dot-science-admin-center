'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { KanbanItem } from '@/components/ui/kanban';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import type { PlatformFeature } from '@/features/platform-features/api/types';
import { FeatureIcon } from '@/features/platform-features/components/feature-display';
import {
  platformNodesById,
  sectionLabels,
  serviceNodesById
} from '@/features/platform-features/constants/options';

export interface SubtaskProgress {
  done: number;
  total: number;
}

interface FeatureCardProps extends Omit<React.ComponentProps<typeof KanbanItem>, 'value'> {
  feature: PlatformFeature;
  progress?: SubtaskProgress;
  onOpen?: () => void;
}

function stopDrag(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export function FeatureCard({ feature, progress, onOpen, ...props }: FeatureCardProps) {
  const platform = platformNodesById.get(feature.platformId);

  return (
    <KanbanItem
      value={feature.id}
      {...props}
      render={<div className='bg-card rounded-md border p-3 shadow-xs' />}
    >
      <div className='flex flex-col gap-2.5'>
        <div className='flex items-start gap-2.5'>
          <FeatureIcon icon={feature.icon} className='size-7' />
          <span className='line-clamp-2 flex-1 text-sm leading-snug font-medium'>
            {feature.name}
          </span>
          {onOpen ? (
            <Button
              variant='ghost'
              size='icon'
              className='-mt-1 -mr-1 size-7 shrink-0'
              aria-label={`Open ${feature.name}`}
              onPointerDown={stopDrag}
              onMouseDown={stopDrag}
              onTouchStart={stopDrag}
              onKeyDown={stopDrag}
              onClick={onOpen}
            >
              <Icons.listCheck className='size-4' />
            </Button>
          ) : null}
        </div>

        <div className='text-muted-foreground flex items-center justify-between gap-2 text-xs'>
          <div className='flex min-w-0 items-center gap-1.5'>
            {platform?.data.logo ? (
              <BrandLogo logo={platform.data.logo} logoDark={platform.data.logoDark} size={14} />
            ) : null}
            <span className='truncate'>
              {platform?.data.label ?? feature.platformId} ·{' '}
              {sectionLabels.get(feature.section) ?? feature.section}
            </span>
          </div>
          {feature.services.length ? (
            <div className='flex shrink-0 items-center gap-1'>
              {feature.services.map((serviceId) => {
                const service = serviceNodesById.get(serviceId);
                return service?.data.logo ? (
                  <BrandLogo
                    key={serviceId}
                    logo={service.data.logo}
                    logoDark={service.data.logoDark}
                    size={12}
                  />
                ) : null;
              })}
            </div>
          ) : null}
        </div>

        {progress?.total ? (
          <div className='flex items-center gap-2'>
            <div className='bg-muted h-1 flex-1 overflow-hidden rounded-full'>
              <div
                className='bg-primary h-full rounded-full transition-[width]'
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            <span className='text-muted-foreground text-[11px] tabular-nums'>
              {progress.done}/{progress.total}
            </span>
          </div>
        ) : null}
      </div>
    </KanbanItem>
  );
}
