'use client';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import { formatUsd } from '@/features/external-services/constants/billing';
import { formatCount } from '@/features/external-services/projection/format';
import { platformNodesById } from '@/features/platform-features/constants/options';
import type { BillingPlan, BillingPlanStatus } from '../api/types';
import { planLimits } from '../constants/limits';
import { planCost } from '../lib/plan-cost';
import { PlanCostSummary } from './plan-cost-summary';

const statusVariant: Record<BillingPlanStatus, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  draft: 'secondary',
  archived: 'outline'
};

function featureCountsByPlatform(featureIds: string[], platformByFeature: Map<string, string>) {
  const counts = new Map<string, number>();
  for (const id of featureIds) {
    const platformId = platformByFeature.get(id);
    if (platformId) counts.set(platformId, (counts.get(platformId) ?? 0) + 1);
  }
  return [...counts.entries()];
}

interface BillingPlanCardProps {
  plan: BillingPlan;
  baseline: number | null;
  averageCompensation: boolean;
  platformByFeature: Map<string, string>;
  onEdit: () => void;
  onDelete: () => void;
}

export function BillingPlanCard({
  plan,
  baseline,
  averageCompensation,
  platformByFeature,
  onEdit,
  onDelete
}: BillingPlanCardProps) {
  const cost = baseline === null ? null : planCost({ ...plan, averageCompensation }, baseline);
  const limits = planLimits.filter((limit) => (plan.limits[limit.id] ?? 0) > 0);
  const platforms = featureCountsByPlatform(plan.featureIds, platformByFeature);

  return (
    <Card className={plan.status === 'archived' ? 'opacity-70' : undefined}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          {plan.name}
          <Badge variant={statusVariant[plan.status]} className='capitalize'>
            {plan.status}
          </Badge>
        </CardTitle>
        {plan.description ? (
          <CardDescription className='line-clamp-2'>{plan.description}</CardDescription>
        ) : null}
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant='ghost' className='h-8 w-8 p-0' />}>
              <span className='sr-only'>Open plan menu</span>
              <Icons.ellipsis className='h-4 w-4' />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onEdit}>
                  <Icons.edit className='mr-2 h-4 w-4' /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete}>
                  <Icons.trash className='mr-2 h-4 w-4' /> Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className='flex flex-1 flex-col gap-4'>
        <div>
          <div className='flex items-baseline gap-1'>
            <span className='text-3xl font-semibold tabular-nums'>
              {formatUsd(plan.monthlyPrice)}
            </span>
            <span className='text-muted-foreground text-sm'>/ month</span>
          </div>
          {plan.annualPrice !== null ? (
            <p className='text-muted-foreground text-xs'>{formatUsd(plan.annualPrice)} / year</p>
          ) : null}
        </div>

        <div className='bg-muted/30 rounded-lg border p-3'>
          {cost ? (
            <PlanCostSummary cost={cost} price={plan.monthlyPrice} />
          ) : (
            <Skeleton className='h-24 w-full' />
          )}
          <p className='text-muted-foreground mt-2 text-[11px]'>
            {formatCount(plan.expectedSubscribers)} expected subscribers,{' '}
            {averageCompensation
              ? `priced at ${plan.usagePct}% average use of limits`
              : 'priced at full use of limits'}
          </p>
        </div>

        <div className='flex flex-col gap-1.5'>
          <span className='text-xs font-medium uppercase'>Limits</span>
          {limits.length || plan.customLimits.length ? (
            <ul className='flex flex-col gap-1 text-sm'>
              {limits.map((limit) => (
                <li key={limit.id} className='flex justify-between gap-3'>
                  <span className='text-muted-foreground'>{limit.label}</span>
                  <span className='tabular-nums'>
                    {formatCount(plan.limits[limit.id] ?? 0)} {limit.unit}
                  </span>
                </li>
              ))}
              {plan.customLimits.map((limit) => (
                <li key={limit.label} className='flex justify-between gap-3'>
                  <span className='text-muted-foreground'>{limit.label}</span>
                  <span>{limit.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-muted-foreground text-sm'>No usage included.</p>
          )}
        </div>
      </CardContent>

      <CardFooter className='flex flex-col items-start gap-2 border-t'>
        <span className='text-xs font-medium uppercase'>
          {plan.featureIds.length} feature{plan.featureIds.length === 1 ? '' : 's'}
        </span>
        {platforms.length ? (
          <div className='flex flex-wrap gap-1.5'>
            {platforms.map(([platformId, count]) => {
              const node = platformNodesById.get(platformId);
              return (
                <Badge key={platformId} variant='outline' className='gap-1'>
                  {node?.data.logo ? (
                    <BrandLogo logo={node.data.logo} logoDark={node.data.logoDark} size={12} />
                  ) : null}
                  {node?.data.label ?? platformId}
                  <span className='text-muted-foreground tabular-nums'>{count}</span>
                </Badge>
              );
            })}
          </div>
        ) : (
          <Button variant='link' size='sm' className='h-auto p-0' onClick={onEdit}>
            Select features
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
