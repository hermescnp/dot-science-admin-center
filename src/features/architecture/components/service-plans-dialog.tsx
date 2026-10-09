'use client';

import { useQuery } from '@tanstack/react-query';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { externalServicesQueryOptions } from '@/features/external-services/api/queries';
import { cn } from '@/lib/utils';
import { servicePlansQueryOptions } from '../api/queries';
import { architectureNodes } from '../data/architecture-graph';
import { modelsForNode } from '../data/openrouter-models';
import { servicePlans, type ServicePlan } from '../data/service-plans';
import { BrandLogo } from './brand-logo';
import { CapabilitiesTable } from './capabilities-table';
import { ModelPricingTable } from './model-pricing-table';

const nodesById = new Map(architectureNodes.map((node) => [node.id, node]));

interface ServicePlansDialogProps {
  serviceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServicePlansDialog({ serviceId, open, onOpenChange }: ServicePlansDialogProps) {
  const service = serviceId ? nodesById.get(serviceId) : undefined;
  const plans = serviceId ? servicePlans[serviceId] : undefined;
  const { data, isPending, isError } = useQuery({ ...servicePlansQueryOptions(), enabled: open });
  const { data: billing } = useQuery({ ...externalServicesQueryOptions(), enabled: open });

  const status = data?.services.find((entry) => entry.id === serviceId);
  const detected = status?.source === 'detected' && status.planId ? status.planId : null;
  const manualPlanId = billing?.services.find((entry) => entry.id === serviceId)?.planId;
  const currentPlanId = detected ?? manualPlanId ?? plans?.fallbackPlanId;
  const detecting = open && isPending;
  const routed = serviceId ? modelsForNode(serviceId) : [];

  return (
    <Dialog open={open && Boolean(service && plans)} onOpenChange={onOpenChange}>
      {service && plans ? (
        <DialogContent className='flex max-h-[90vh] w-[95vw] max-w-[1200px] flex-col gap-4 p-5 sm:max-w-[1200px]'>
          <DialogHeader className='flex-row items-center gap-3 pr-10'>
            {service.data.logo ? (
              <BrandLogo logo={service.data.logo} logoDark={service.data.logoDark} size={40} />
            ) : null}
            <div className='min-w-0 flex-1'>
              <DialogTitle className='text-base'>{service.data.label}</DialogTitle>
              <DialogDescription className='text-xs'>{service.data.description}</DialogDescription>
            </div>
            <a
              href={plans.pricingUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 text-xs transition-colors'
            >
              Pricing
              <Icons.externalLink className='size-3.5' stroke={1.5} />
            </a>
          </DialogHeader>
          {plans.pricingNote ? (
            <p className='bg-muted/60 text-muted-foreground rounded-lg px-3 py-2 text-xs leading-snug'>
              {plans.pricingNote}
            </p>
          ) : null}
          <div className='-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-1'>
            {routed.length ? (
              <section className='flex shrink-0 flex-col gap-2'>
                <h3 className='text-sm font-medium'>
                  {serviceId === 'openrouter' ? 'Models in use' : 'Models via OpenRouter'}
                </h3>
                <ModelPricingTable models={routed} enabled={open} />
              </section>
            ) : null}
            <CapabilitiesTable
              capabilities={plans.capabilities}
              currentPlanId={currentPlanId}
              currentPlanName={plans.plans.find((plan) => plan.id === currentPlanId)?.name}
              detected={Boolean(detected)}
              status={status}
              usagePending={detecting}
              usageFailed={isError}
            />
            <ul className='grid shrink-0 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3'>
              {plans.plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  label={plans.kind === 'usage' ? 'Tier' : 'Plan'}
                  current={plan.id === currentPlanId}
                  detected={Boolean(detected)}
                  detecting={detecting}
                />
              ))}
            </ul>
          </div>
          <p className='text-muted-foreground text-[11px]'>
            Prices as of {plans.asOf}. Current plan is{' '}
            {detected
              ? 'detected from the provider API'
              : manualPlanId
                ? 'set on the Maintenance page'
                : 'the catalog default'}
            .
          </p>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

interface PlanCardProps {
  plan: ServicePlan;
  label: string;
  current: boolean;
  detected: boolean;
  detecting: boolean;
}

function PlanCard({ plan, label, current, detected, detecting }: PlanCardProps) {
  return (
    <li
      className={cn(
        'border-border bg-card/60 flex flex-col gap-3 rounded-xl border p-4',
        current && 'border-primary ring-primary/30 ring-2'
      )}
    >
      <div className='flex min-h-5 items-center justify-between gap-2'>
        <span className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
          {label}
        </span>
        {current ? (
          <Badge className='gap-1'>
            {detecting ? <Icons.spinner className='size-3 animate-spin' /> : null}
            Current · {detected ? 'Detected' : 'Configured'}
          </Badge>
        ) : null}
      </div>
      <div>
        <div className='text-base font-semibold'>{plan.name}</div>
        <div className='flex items-baseline gap-1.5'>
          <span className='text-2xl font-semibold tracking-tight'>{plan.price}</span>
          {plan.priceNote ? (
            <span className='text-muted-foreground text-xs'>{plan.priceNote}</span>
          ) : null}
        </div>
      </div>
      <ul className='flex flex-col gap-1.5'>
        {plan.features.map((feature) => (
          <li key={feature} className='flex items-start gap-2 text-xs leading-snug'>
            <Icons.check className='text-primary mt-px size-3.5 shrink-0' stroke={2} />
            {feature}
          </li>
        ))}
      </ul>
    </li>
  );
}
