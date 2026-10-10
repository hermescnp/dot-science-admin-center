'use client';

import { Fragment, useMemo, useState } from 'react';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import { formatUsd } from '@/features/external-services/constants/billing';
import { formatCount } from '@/features/external-services/projection/format';
import { platformNodesById } from '@/features/platform-features/constants/options';
import { cn } from '@/lib/utils';
import type { BillingFeatureOption, BillingPlan, BillingPlanStatus } from '../api/types';
import { planLimits } from '../constants/limits';
import { planCost, type PlanCost } from '../lib/plan-cost';
import { FeatureDetailDialog } from './feature-detail-dialog';
import { MarginValue } from './plan-cost-summary';
import { useTogglePlanFeature } from './use-toggle-plan-feature';

const statusVariant: Record<BillingPlanStatus, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  draft: 'secondary',
  archived: 'outline'
};

const STICKY = 'bg-background sticky left-0 z-10';

interface PlatformGroup {
  platformId: string;
  features: BillingFeatureOption[];
}

function groupByPlatform(features: BillingFeatureOption[]): PlatformGroup[] {
  const groups = new Map<string, BillingFeatureOption[]>();
  for (const feature of features) {
    const list = groups.get(feature.platformId);
    if (list) list.push(feature);
    else groups.set(feature.platformId, [feature]);
  }
  return [...groups].map(([platformId, list]) => ({ platformId, features: list }));
}

/** Custom limit labels across all plans, keyed case-insensitively, in first-seen order. */
function customLimitLabels(plans: BillingPlan[]) {
  const labels = new Map<string, string>();
  for (const plan of plans) {
    for (const limit of plan.customLimits) {
      const key = limit.label.trim().toLowerCase();
      if (!labels.has(key)) labels.set(key, limit.label.trim());
    }
  }
  return [...labels];
}

function Dash() {
  return <span className='text-muted-foreground'>-</span>;
}

function SectionRow({ title, span }: { title: string; span: number }) {
  return (
    <TableRow className='bg-muted/40 hover:bg-muted/40'>
      <TableCell
        colSpan={span}
        className='text-muted-foreground py-1.5 text-xs font-semibold uppercase'
      >
        {title}
      </TableCell>
    </TableRow>
  );
}

function ValueRow({
  label,
  plans,
  render,
  className
}: {
  label: React.ReactNode;
  plans: BillingPlan[];
  render: (plan: BillingPlan, index: number) => React.ReactNode;
  className?: string;
}) {
  return (
    <TableRow className={className}>
      <TableCell className={cn(STICKY, 'text-muted-foreground')}>{label}</TableCell>
      {plans.map((plan, index) => (
        <TableCell
          key={plan.id}
          className={cn('tabular-nums', plan.status === 'archived' && 'opacity-60')}
        >
          {render(plan, index)}
        </TableCell>
      ))}
    </TableRow>
  );
}

interface BillingPlanComparisonProps {
  plans: BillingPlan[];
  features: BillingFeatureOption[];
  baseline: number | null;
  averageCompensation: boolean;
}

export function BillingPlanComparison({
  plans,
  features,
  baseline,
  averageCompensation
}: BillingPlanComparisonProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [selectedFeature, setSelectedFeature] = useState<BillingFeatureOption | null>(null);
  const toggleFeature = useTogglePlanFeature();

  const platformGroups = useMemo(() => groupByPlatform(features), [features]);
  const customLabels = useMemo(() => customLimitLabels(plans), [plans]);
  const featureSets = useMemo(() => plans.map((plan) => new Set(plan.featureIds)), [plans]);
  const costs = useMemo<(PlanCost | null)[]>(
    () =>
      plans.map((plan) =>
        baseline === null ? null : planCost({ ...plan, averageCompensation }, baseline)
      ),
    [plans, baseline, averageCompensation]
  );

  const span = plans.length + 1;

  const toggle = (platformId: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(platformId)) next.delete(platformId);
      else next.add(platformId);
      return next;
    });

  const costCell = (index: number, pick: (cost: PlanCost) => number) => {
    const cost = costs[index];
    return cost ? formatUsd(pick(cost)) : <Skeleton className='h-4 w-14' />;
  };

  return (
    <section className='flex flex-col gap-3'>
      <h2 className='text-lg font-semibold'>Compare plans</h2>
      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(STICKY, 'min-w-48')} />
              {plans.map((plan) => (
                <TableHead
                  key={plan.id}
                  className={cn('min-w-36', plan.status === 'archived' && 'opacity-60')}
                >
                  <div className='flex items-center gap-2 py-1'>
                    <span className='text-foreground font-semibold'>{plan.name}</span>
                    <Badge variant={statusVariant[plan.status]} className='capitalize'>
                      {plan.status}
                    </Badge>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            <SectionRow title='Pricing' span={span} />
            <ValueRow
              label='Monthly price'
              plans={plans}
              render={(plan) => (
                <span className='font-semibold'>{formatUsd(plan.monthlyPrice)}</span>
              )}
            />
            <ValueRow
              label='Annual price'
              plans={plans}
              render={(plan) =>
                plan.annualPrice !== null ? (
                  formatUsd(plan.annualPrice)
                ) : (
                  <span className='text-muted-foreground'>
                    {formatUsd(plan.monthlyPrice * 12)} (monthly x 12)
                  </span>
                )
              }
            />
            <ValueRow
              label='Expected subscribers'
              plans={plans}
              render={(plan) => formatCount(plan.expectedSubscribers)}
            />
            <ValueRow
              label='Average use of limits'
              plans={plans}
              render={(plan) => `${plan.usagePct}%`}
            />

            <SectionRow
              title={`Maintenance cost per subscriber (${averageCompensation ? 'average use' : 'full limits'})`}
              span={span}
            />
            <ValueRow
              label='Usage at limits'
              plans={plans}
              render={(_, index) => costCell(index, (cost) => cost.usageCost)}
            />
            <ValueRow
              label='Share of fixed costs'
              plans={plans}
              render={(_, index) => costCell(index, (cost) => cost.fixedShare)}
            />
            <ValueRow
              label='Cost per subscriber'
              plans={plans}
              render={(_, index) => (
                <span className='font-medium'>{costCell(index, (cost) => cost.totalCost)}</span>
              )}
            />
            <ValueRow
              label='Margin'
              plans={plans}
              render={(plan, index) => {
                const cost = costs[index];
                return cost ? (
                  <MarginValue cost={cost} price={plan.monthlyPrice} />
                ) : (
                  <Skeleton className='h-4 w-14' />
                );
              }}
            />

            <SectionRow title='Limits per month' span={span} />
            {planLimits.map((limit) => {
              const best = Math.max(0, ...plans.map((plan) => plan.limits[limit.id] ?? 0));
              return (
                <ValueRow
                  key={limit.id}
                  label={limit.label}
                  plans={plans}
                  render={(plan) => {
                    const value = plan.limits[limit.id] ?? 0;
                    if (value <= 0) return <Dash />;
                    return (
                      <span className={cn(plans.length > 1 && value === best && 'font-semibold')}>
                        {formatCount(value)} {limit.unit}
                      </span>
                    );
                  }}
                />
              );
            })}

            {customLabels.length ? (
              <>
                <SectionRow title='Other limits' span={span} />
                {customLabels.map(([key, label]) => (
                  <ValueRow
                    key={key}
                    label={label}
                    plans={plans}
                    render={(plan) =>
                      plan.customLimits.find((limit) => limit.label.trim().toLowerCase() === key)
                        ?.value ?? <Dash />
                    }
                  />
                ))}
              </>
            ) : null}

            <SectionRow title='Features' span={span} />
            {platformGroups.map((group) => {
              const node = platformNodesById.get(group.platformId);
              const isOpen = expanded.has(group.platformId);
              return (
                <Fragment key={group.platformId}>
                  <TableRow
                    className='cursor-pointer'
                    onClick={() => toggle(group.platformId)}
                    aria-expanded={isOpen}
                  >
                    <TableCell className={STICKY}>
                      <div className='flex items-center gap-2'>
                        {isOpen ? (
                          <Icons.chevronDown className='text-muted-foreground size-4' />
                        ) : (
                          <Icons.chevronRight className='text-muted-foreground size-4' />
                        )}
                        {node?.data.logo ? (
                          <BrandLogo
                            logo={node.data.logo}
                            logoDark={node.data.logoDark}
                            size={16}
                          />
                        ) : null}
                        <span className='font-medium'>{node?.data.label ?? group.platformId}</span>
                      </div>
                    </TableCell>
                    {plans.map((plan, index) => {
                      const count = group.features.filter((feature) =>
                        featureSets[index].has(feature.id)
                      ).length;
                      return (
                        <TableCell
                          key={plan.id}
                          className={cn('tabular-nums', plan.status === 'archived' && 'opacity-60')}
                        >
                          {count ? (
                            <span>
                              {count}{' '}
                              <span className='text-muted-foreground'>
                                of {group.features.length}
                              </span>
                            </span>
                          ) : (
                            <Dash />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {isOpen
                    ? group.features.map((feature) => (
                        <ValueRow
                          key={feature.id}
                          label={
                            <button
                              type='button'
                              onClick={() => setSelectedFeature(feature)}
                              className='hover:text-foreground pl-6 text-left text-xs underline-offset-4 hover:underline'
                            >
                              {feature.name}
                            </button>
                          }
                          plans={plans}
                          render={(plan, index) => {
                            const included = featureSets[index].has(feature.id);
                            return (
                              <button
                                type='button'
                                onClick={() => toggleFeature(plan, feature.id)}
                                aria-pressed={included}
                                aria-label={`${included ? 'Remove' : 'Add'} ${feature.name} ${included ? 'from' : 'to'} ${plan.name}`}
                                className='hover:bg-muted group flex size-7 items-center justify-center rounded-md'
                              >
                                {included ? (
                                  <Icons.check className='size-4 text-emerald-600 dark:text-emerald-400' />
                                ) : (
                                  <>
                                    <span className='text-muted-foreground group-hover:hidden'>
                                      -
                                    </span>
                                    <Icons.add className='text-muted-foreground hidden size-4 group-hover:block' />
                                  </>
                                )}
                              </button>
                            );
                          }}
                        />
                      ))
                    : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <FeatureDetailDialog
        feature={selectedFeature}
        plans={plans}
        onToggle={toggleFeature}
        onOpenChange={(open) => {
          if (!open) setSelectedFeature(null);
        }}
      />
    </section>
  );
}
