'use client';

import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertModal } from '@/components/modal/alert-modal';
import { Icons } from '@/components/icons';
import { deleteBillingPlanMutation } from '../api/mutations';
import { billingPlansQueryOptions } from '../api/queries';
import type { BillingPlan } from '../api/types';
import { BillingPlanCard } from './billing-plan-card';
import { BillingPlanComparison } from './billing-plan-comparison';
import { BillingPlanFormDialog } from './billing-plan-form-dialog';
import { useAverageCompensation } from './use-average-compensation';
import { useStackBaseline } from './use-stack-baseline';

export function BillingPlanGrid() {
  const { data } = useSuspenseQuery(billingPlansQueryOptions());
  const baseline = useStackBaseline();
  const [averageCompensation] = useAverageCompensation();
  const [editing, setEditing] = useState<BillingPlan | null>(null);
  const [deleting, setDeleting] = useState<BillingPlan | null>(null);

  const platformByFeature = useMemo(
    () => new Map(data.features.map((feature) => [feature.id, feature.platformId])),
    [data.features]
  );

  const deleteMutation = useMutation({
    ...deleteBillingPlanMutation,
    onSuccess: (...args) => {
      deleteBillingPlanMutation.onSuccess?.(...args);
      toast.success('Plan deleted');
      setDeleting(null);
    },
    onError: () => toast.error("Couldn't delete the plan. Try again.")
  });

  if (!data.plans.length) {
    return (
      <div className='text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center'>
        <Icons.creditCard className='size-8' />
        <p className='text-foreground font-medium'>No billing plans yet</p>
        <p className='max-w-sm text-sm'>
          Add a plan to set its limits and features, and see what each subscriber costs to maintain.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-8'>
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        {data.plans.map((plan) => (
          <BillingPlanCard
            key={plan.id}
            plan={plan}
            baseline={baseline}
            averageCompensation={averageCompensation}
            platformByFeature={platformByFeature}
            onEdit={() => setEditing(plan)}
            onDelete={() => setDeleting(plan)}
          />
        ))}
      </div>
      <BillingPlanComparison
        plans={data.plans}
        features={data.features}
        baseline={baseline}
        averageCompensation={averageCompensation}
      />
      {editing ? (
        <BillingPlanFormDialog
          key={editing.id}
          plan={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}
      <AlertModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id);
        }}
        loading={deleteMutation.isPending}
        title={`Delete ${deleting?.name ?? 'plan'}?`}
        description='The plan and its feature list are removed. This cannot be undone.'
        confirmLabel='Delete'
      />
    </div>
  );
}
