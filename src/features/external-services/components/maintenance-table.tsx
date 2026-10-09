'use client';

import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Fragment, useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { servicePlansQueryOptions } from '@/features/architecture/api/queries';
import type { ServicePlanStatus } from '@/features/architecture/api/types';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import { ServicePlansDialog } from '@/features/architecture/components/service-plans-dialog';
import type { ArchitectureNode } from '@/features/architecture/data/architecture-graph';
import { servicePlans } from '@/features/architecture/data/service-plans';
import { serviceNodesById } from '@/features/platform-features/constants/options';
import { cn } from '@/lib/utils';
import { deleteExternalServiceItemMutation } from '../api/mutations';
import { externalServicesQueryOptions } from '../api/queries';
import type { CurrencyRates, ExternalService, ExternalServiceItem } from '../api/types';
import {
  billingCycleLabels,
  costOf,
  formatMoney,
  formatUsd,
  itemKindLabels,
  resolvePlan,
  spendUsageKeys,
  toUsd,
  type Cost,
  type CostPeriod,
  type PlanSource
} from '../constants/billing';
import { ExternalServiceFormSheet } from './external-service-form-sheet';
import { ExternalServiceItemFormSheet } from './external-service-item-form-sheet';

const sourceLabels: Record<PlanSource, string> = {
  detected: 'Detected',
  manual: 'Manual',
  default: 'Default'
};

const sourceClassNames: Record<PlanSource, string> = {
  detected: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  manual: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  default: 'text-muted-foreground'
};

const layerLabels = { core: 'Core', addon: 'Add-on', operations: 'Operations' };

interface Row {
  service: ExternalService;
  node: ArchitectureNode;
  billedVia: ArchitectureNode | undefined;
}

type ItemEditor = { row: Row; item?: ExternalServiceItem };

export function MaintenanceTable() {
  const {
    data: { services, rates }
  } = useSuspenseQuery(externalServicesQueryOptions());
  const plansQuery = useQuery(servicePlansQueryOptions());
  const [plansServiceId, setPlansServiceId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [itemEditor, setItemEditor] = useState<ItemEditor | null>(null);
  const [deletingItem, setDeletingItem] = useState<ExternalServiceItem | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const deleteMutation = useMutation({
    ...deleteExternalServiceItemMutation,
    onSuccess: (...args) => {
      deleteExternalServiceItemMutation.onSuccess?.(...args);
      toast.success(`${deletingItem?.label ?? 'Item'} removed`);
      setDeletingItem(null);
    },
    onError: () => toast.error("Couldn't remove the item")
  });

  const statusById = new Map(plansQuery.data?.services.map((status) => [status.id, status]));
  const rows: Row[] = services.flatMap((service) => {
    const node = serviceNodesById.get(service.id);
    if (!node) return [];
    const billedVia = node.data.via ? serviceNodesById.get(node.data.via) : undefined;
    return [{ service, node, billedVia }];
  });

  let monthlyTotal = 0;
  let annualTotal = 0;
  for (const { service, billedVia } of rows) {
    if (billedVia) continue;
    monthlyTotal += costOf(service, 'monthly', rates)?.usd ?? 0;
    annualTotal += costOf(service, 'annual', rates)?.usd ?? 0;
  }

  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <>
      {/* The table container already scrolls horizontally, so sticky rows need it to scroll
          vertically too; page-level scrolling can't pin them. */}
      <div className='overflow-hidden rounded-lg border [&_[data-slot=table-container]]:max-h-[calc(100dvh-12rem)] [&_[data-slot=table-container]]:overflow-y-auto'>
        <Table>
          <TableHeader className='bg-background sticky top-0 z-10 shadow-[inset_0_-1px_0_var(--color-border)]'>
            <TableRow>
              <TableHead className='px-4'>Service</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead className='text-right'>Monthly</TableHead>
              <TableHead className='text-right'>Annual</TableHead>
              <TableHead>Renews</TableHead>
              <TableHead>Live usage</TableHead>
              <TableHead className='w-12' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const hasPlans = Boolean(servicePlans[row.service.id]);
              const items = row.service.items;
              const expanded = items.length > 0 && !collapsed.has(row.service.id);
              return (
                <Fragment key={row.service.id}>
                  <TableRow
                    onClick={hasPlans ? () => setPlansServiceId(row.service.id) : undefined}
                    className={cn(hasPlans && 'cursor-pointer')}
                  >
                    <TableCell className='min-w-64 px-4 whitespace-normal'>
                      <ServiceSummary
                        row={row}
                        expanded={expanded}
                        onToggle={() => toggle(row.service.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <PlanCell
                        row={row}
                        status={statusById.get(row.service.id)}
                        detecting={plansQuery.isPending}
                      />
                    </TableCell>
                    <TableCell>
                      {row.billedVia ? (
                        <span className='text-muted-foreground text-xs'>
                          Billed via {row.billedVia.data.label}
                        </span>
                      ) : (
                        billingCycleLabels.get(row.service.billingCycle)
                      )}
                    </TableCell>
                    {(['monthly', 'annual'] as const).map((period) => (
                      <TableCell key={period} className='text-right tabular-nums'>
                        <ServiceCostCell row={row} period={period} rates={rates} />
                      </TableCell>
                    ))}
                    <TableCell>
                      <RenewsOn date={row.service.renewsOn} />
                    </TableCell>
                    <TableCell className='max-w-56 whitespace-normal'>
                      <UsageCell
                        serviceId={row.service.id}
                        status={statusById.get(row.service.id)}
                        detecting={plansQuery.isPending}
                      />
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <RowActions
                        hasPlans={hasPlans}
                        onEdit={() => setEditing(row)}
                        onAddItem={() => setItemEditor({ row })}
                        onViewPlans={() => setPlansServiceId(row.service.id)}
                      />
                    </TableCell>
                  </TableRow>
                  {expanded
                    ? items.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          rates={rates}
                          onEdit={() => setItemEditor({ row, item })}
                          onDelete={() => setDeletingItem(item)}
                        />
                      ))
                    : null}
                </Fragment>
              );
            })}
          </TableBody>
          <TableFooter className='bg-muted sticky bottom-0 z-10 border-t-0 shadow-[inset_0_1px_0_var(--color-border)]'>
            <TableRow>
              <TableCell colSpan={3} className='px-4'>
                Total fixed costs (USD)
              </TableCell>
              <TableCell className='text-right tabular-nums'>{formatUsd(monthlyTotal)}</TableCell>
              <TableCell className='text-right tabular-nums'>{formatUsd(annualTotal)}</TableCell>
              <TableCell colSpan={3} className='text-muted-foreground text-xs font-normal'>
                Usage-based spend is not included · CAD at {rates.CAD} USD
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <ServicePlansDialog
        serviceId={plansServiceId}
        open={plansServiceId !== null}
        onOpenChange={(open) => {
          if (!open) setPlansServiceId(null);
        }}
      />
      {editing ? (
        <ExternalServiceFormSheet
          key={editing.service.id}
          service={editing.service}
          label={editing.node.data.label}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}
      {itemEditor ? (
        <ExternalServiceItemFormSheet
          key={itemEditor.item?.id ?? `new-${itemEditor.row.service.id}`}
          serviceId={itemEditor.row.service.id}
          serviceLabel={itemEditor.row.node.data.label}
          item={itemEditor.item}
          open
          onOpenChange={(open) => {
            if (!open) setItemEditor(null);
          }}
        />
      ) : null}
      <AlertModal
        isOpen={deletingItem !== null}
        onClose={() => setDeletingItem(null)}
        onConfirm={() => {
          if (deletingItem) deleteMutation.mutate(deletingItem.id);
        }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}

interface ServiceSummaryProps {
  row: Row;
  expanded: boolean;
  onToggle: () => void;
}

function ServiceSummary({ row, expanded, onToggle }: ServiceSummaryProps) {
  const { node, billedVia, service } = row;
  const layer = billedVia ? `Via ${billedVia.data.label}` : layerLabels[node.data.layer ?? 'core'];
  return (
    <div className='flex items-start gap-3 py-1'>
      {service.items.length ? (
        <Button
          variant='ghost'
          size='icon-sm'
          className='-ml-2 shrink-0'
          aria-label={expanded ? 'Hide items' : 'Show items'}
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
        >
          <Icons.chevronRight
            className={cn('size-4 transition-transform', expanded && 'rotate-90')}
          />
        </Button>
      ) : null}
      {node.data.logo ? (
        <BrandLogo logo={node.data.logo} logoDark={node.data.logoDark} size={32} />
      ) : null}
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-semibold'>{node.data.label}</span>
          <Badge variant='outline' className='h-5 px-1.5 text-[11px]'>
            {layer}
          </Badge>
        </div>
        <p className='text-muted-foreground mt-1 text-xs leading-snug'>{node.data.description}</p>
      </div>
    </div>
  );
}

interface PlanCellProps {
  row: Row;
  status: ServicePlanStatus | undefined;
  detecting: boolean;
}

function PlanCell({ row, status, detecting }: PlanCellProps) {
  if (row.billedVia) return <span className='text-muted-foreground'>—</span>;
  const resolved = resolvePlan(row.service.id, row.service.planId, status);
  if (!resolved) {
    return row.service.items.length ? (
      <span className='text-muted-foreground text-xs'>
        {row.service.items.length} {row.service.items.length === 1 ? 'item' : 'items'}
      </span>
    ) : (
      <span className='text-muted-foreground'>—</span>
    );
  }
  return (
    <div className='flex items-center gap-2'>
      <span className='font-medium'>{resolved.plan.name}</span>
      {detecting && resolved.source !== 'manual' ? (
        <Icons.spinner className='text-muted-foreground size-3.5 animate-spin' />
      ) : (
        <Badge
          variant='outline'
          className={cn('h-5 px-1.5 text-[11px]', sourceClassNames[resolved.source])}
        >
          {sourceLabels[resolved.source]}
        </Badge>
      )}
    </div>
  );
}

function CostAmount({ cost }: { cost: Cost }) {
  return (
    <div className='flex flex-col items-end'>
      <span>{formatUsd(cost.usd)}</span>
      {cost.native ? (
        <span className='text-muted-foreground text-[11px]'>
          {formatMoney(cost.native.value, cost.native.currency)}
        </span>
      ) : null}
    </div>
  );
}

interface ServiceCostCellProps {
  row: Row;
  period: CostPeriod;
  rates: CurrencyRates;
}

function ServiceCostCell({ row, period, rates }: ServiceCostCellProps) {
  if (row.billedVia) return <span className='text-muted-foreground'>—</span>;
  const cost = costOf(row.service, period, rates);
  if (cost) return <CostAmount cost={cost} />;
  return (
    <span className='text-muted-foreground text-xs'>
      {row.service.billingCycle === 'usage' ? 'Usage-based' : 'Not set'}
    </span>
  );
}

function RenewsOn({ date }: { date: string | null }) {
  if (!date) return <span className='text-muted-foreground'>—</span>;
  return <>{format(new Date(`${date}T00:00:00`), 'MMM d, yyyy')}</>;
}

interface ItemRowProps {
  item: ExternalServiceItem;
  rates: CurrencyRates;
  onEdit: () => void;
  onDelete: () => void;
}

function ItemRow({ item, rates, onEdit, onDelete }: ItemRowProps) {
  const cost = (period: CostPeriod): Cost => {
    const value =
      item.billingCycle === period
        ? item.amount
        : period === 'monthly'
          ? item.amount / 12
          : item.amount * 12;
    return {
      usd: toUsd(value, item.currency, rates),
      native: item.currency === 'USD' ? null : { value, currency: item.currency }
    };
  };

  return (
    <TableRow className='bg-muted/30 hover:bg-muted/40'>
      <TableCell className='py-2 pr-4 pl-[4.75rem]'>
        <div className='flex items-center gap-2'>
          <span className='font-mono text-xs'>{item.label}</span>
          <Badge variant='secondary' className='h-5 px-1.5 text-[11px]'>
            {itemKindLabels.get(item.kind)}
          </Badge>
        </div>
      </TableCell>
      <TableCell />
      <TableCell className='text-xs'>{billingCycleLabels.get(item.billingCycle)}</TableCell>
      {(['monthly', 'annual'] as const).map((period) => (
        <TableCell key={period} className='text-right text-xs tabular-nums'>
          <CostAmount cost={cost(period)} />
        </TableCell>
      ))}
      <TableCell className='text-xs'>
        <RenewsOn date={item.renewsOn} />
      </TableCell>
      <TableCell className='text-muted-foreground max-w-56 text-xs whitespace-normal'>
        {item.notes || '—'}
      </TableCell>
      <TableCell>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger render={<Button variant='ghost' className='h-8 w-8 p-0' />}>
            <span className='sr-only'>Open item menu</span>
            <Icons.ellipsis className='h-4 w-4' />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onEdit}>
                <Icons.edit className='mr-2 h-4 w-4' /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete}>
                <Icons.trash className='mr-2 h-4 w-4' /> Remove
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

interface UsageCellProps {
  serviceId: string;
  status: ServicePlanStatus | undefined;
  detecting: boolean;
}

function UsageCell({ serviceId, status, detecting }: UsageCellProps) {
  const key = spendUsageKeys[serviceId];
  if (!key) return <span className='text-muted-foreground'>—</span>;
  if (detecting) {
    return <Icons.spinner className='text-muted-foreground size-3.5 animate-spin' />;
  }
  const spend = status?.usage?.[key];
  if (!spend) return <span className='text-muted-foreground'>—</span>;
  return <span className='text-xs'>{spend}</span>;
}

interface RowActionsProps {
  hasPlans: boolean;
  onEdit: () => void;
  onAddItem: () => void;
  onViewPlans: () => void;
}

function RowActions({ hasPlans, onEdit, onAddItem, onViewPlans }: RowActionsProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger render={<Button variant='ghost' className='h-8 w-8 p-0' />}>
        <span className='sr-only'>Open menu</span>
        <Icons.ellipsis className='h-4 w-4' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onEdit}>
            <Icons.edit className='mr-2 h-4 w-4' /> Edit billing
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddItem}>
            <Icons.add className='mr-2 h-4 w-4' /> Add domain/mailbox
          </DropdownMenuItem>
          {hasPlans ? (
            <DropdownMenuItem onClick={onViewPlans}>
              <Icons.listDetails className='mr-2 h-4 w-4' /> View plans
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
