import { serviceNodesById } from '@/features/platform-features/constants/options';
import { formatUsd } from '@/features/external-services/constants/billing';
import { cn } from '@/lib/utils';
import type { PlanCost } from '../lib/plan-cost';

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', className)}>
      <span className='text-muted-foreground'>{label}</span>
      <span className='tabular-nums'>{value}</span>
    </div>
  );
}

export function MarginValue({ cost, price }: { cost: PlanCost; price: number }) {
  const tone =
    cost.margin < 0
      ? 'text-destructive'
      : cost.marginPct !== null && cost.marginPct < 0.3
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400';
  return (
    <span className={cn('font-semibold tabular-nums', tone)}>
      {formatUsd(cost.margin)}
      {price > 0 && cost.marginPct !== null ? ` (${Math.round(cost.marginPct * 100)}%)` : ''}
    </span>
  );
}

interface PlanCostSummaryProps {
  cost: PlanCost;
  price: number;
  showBreakdown?: boolean;
}

/** Maintenance cost of one subscriber per month, and the margin left at the plan price. */
export function PlanCostSummary({ cost, price, showBreakdown }: PlanCostSummaryProps) {
  return (
    <div className='flex flex-col gap-1.5 text-xs'>
      <Row label='Usage at limits' value={formatUsd(cost.usageCost)} />
      {showBreakdown
        ? cost.byService.map((item) => (
            <Row
              key={item.serviceId}
              label={serviceNodesById.get(item.serviceId)?.data.label ?? item.serviceId}
              value={formatUsd(item.cost)}
              className='pl-3 text-[11px]'
            />
          ))
        : null}
      <Row label='Share of fixed costs' value={formatUsd(cost.fixedShare)} />
      <Row
        label='Cost per subscriber'
        value={formatUsd(cost.totalCost)}
        className='border-t pt-1.5 font-medium [&>span:first-child]:text-foreground'
      />
      <div className='flex items-baseline justify-between gap-3'>
        <span className='text-foreground font-medium'>Margin</span>
        <MarginValue cost={cost} price={price} />
      </div>
    </div>
  );
}
