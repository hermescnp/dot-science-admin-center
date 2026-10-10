'use client';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { BrandLogo } from '@/features/architecture/components/brand-logo';
import {
  FeatureCost,
  FeatureIcon,
  FeatureStatusBadge,
  ServiceBadges
} from '@/features/platform-features/components/feature-display';
import { platformNodesById, sectionLabels } from '@/features/platform-features/constants/options';
import type { BillingFeatureOption, BillingPlan } from '../api/types';

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='text-muted-foreground text-xs font-medium uppercase'>{title}</span>
      {children}
    </div>
  );
}

interface FeatureDetailDialogProps {
  feature: BillingFeatureOption | null;
  plans: BillingPlan[];
  onToggle: (plan: BillingPlan, featureId: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function FeatureDetailDialog({
  feature,
  plans,
  onToggle,
  onOpenChange
}: FeatureDetailDialogProps) {
  const platform = feature ? platformNodesById.get(feature.platformId) : undefined;

  return (
    <Dialog open={feature !== null} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        {feature ? (
          <>
            <DialogHeader>
              <div className='flex items-start gap-3'>
                <FeatureIcon icon={feature.icon} className='size-10' />
                <div className='flex min-w-0 flex-col gap-1.5'>
                  <DialogTitle className='flex flex-wrap items-center gap-2'>
                    {feature.name}
                    <FeatureStatusBadge
                      status={feature.status}
                      className='h-5 px-1.5 text-[11px]'
                    />
                  </DialogTitle>
                  <DialogDescription className='flex items-center gap-1.5'>
                    {platform?.data.logo ? (
                      <BrandLogo
                        logo={platform.data.logo}
                        logoDark={platform.data.logoDark}
                        size={14}
                      />
                    ) : null}
                    {platform?.data.label ?? feature.platformId}
                    <span aria-hidden>·</span>
                    {sectionLabels.get(feature.section) ?? feature.section}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className='flex flex-col gap-4'>
              {feature.description ? (
                <p className='text-sm leading-relaxed'>{feature.description}</p>
              ) : null}

              {feature.services.length ? (
                <DetailSection title='Services'>
                  <ServiceBadges services={feature.services} />
                </DetailSection>
              ) : null}

              <DetailSection title='Estimated cost per use'>
                <FeatureCost services={feature.services} />
              </DetailSection>

              <DetailSection title='Included in'>
                <div className='flex flex-col gap-1'>
                  {plans.map((plan) => {
                    const included = plan.featureIds.includes(feature.id);
                    return (
                      <label
                        key={plan.id}
                        className='hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm'
                      >
                        <Checkbox
                          checked={included}
                          onCheckedChange={() => onToggle(plan, feature.id)}
                        />
                        <span className={included ? undefined : 'text-muted-foreground'}>
                          {plan.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </DetailSection>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
