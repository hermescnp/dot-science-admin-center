'use client';

import { Badge } from '@/components/ui/badge';
import { KanbanColumn } from '@/components/ui/kanban';
import type {
  PlatformFeature,
  PlatformFeatureStatus
} from '@/features/platform-features/api/types';
import { platformFeatureStatusesByValue } from '@/features/platform-features/constants/options';
import { cn } from '@/lib/utils';
import { FeatureCard, type SubtaskProgress } from './task-card';

interface StatusColumnProps {
  value: PlatformFeatureStatus;
  features: PlatformFeature[];
  progressByFeature: Map<string, SubtaskProgress>;
  onOpenFeature: (id: string) => void;
}

export function StatusColumn({
  value,
  features,
  progressByFeature,
  onOpenFeature
}: StatusColumnProps) {
  const status = platformFeatureStatusesByValue.get(value);
  const StatusIcon = status?.icon;

  return (
    <KanbanColumn value={value} className='w-full shrink-0 md:w-[320px]'>
      <div className='flex items-center gap-2'>
        {StatusIcon ? (
          <span
            className={cn(
              'flex size-6 items-center justify-center rounded-md border',
              status.className
            )}
          >
            <StatusIcon className='size-3.5' />
          </span>
        ) : null}
        <span className='text-sm font-semibold'>{status?.label ?? value}</span>
        <Badge variant='secondary' className='pointer-events-none rounded-sm'>
          {features.length}
        </Badge>
      </div>
      <div className='flex min-h-16 flex-col gap-2 p-0.5'>
        {features.map((feature) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            progress={progressByFeature.get(feature.id)}
            onOpen={() => onOpenFeature(feature.id)}
            asHandle
          />
        ))}
      </div>
    </KanbanColumn>
  );
}
