'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { FieldGroup, FieldLabel } from '@/components/ui/field';
import { LoadingButton } from '@/components/ui/loading-button';
import { formatUsd } from '@/features/external-services/constants/billing';
import { useAppForm } from '@/lib/form';
import { createBillingPlanMutation, updateBillingPlanMutation } from '../api/mutations';
import { billingPlansQueryOptions } from '../api/queries';
import type { BillingFeatureOption, BillingPlan } from '../api/types';
import { planLimits } from '../constants/limits';
import { compensationMultiplier, planCost, priceForMargin } from '../lib/plan-cost';
import {
  billingPlanSchema,
  toBillingPlanPayload,
  type BillingPlanFormValues
} from '../schemas/billing-plan';
import { FeaturePicker } from './feature-picker';
import { PlanCostSummary } from './plan-cost-summary';
import { useAverageCompensation } from './use-average-compensation';
import { useStackBaseline } from './use-stack-baseline';

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' }
];

const targetMargins = [0.5, 0.7];

const NO_FEATURES: BillingFeatureOption[] = [];

function saveErrorMessage(error: Error) {
  return error.message.includes('409')
    ? 'A plan with this name already exists.'
    : "Couldn't save the plan. Try again.";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className='text-sm font-semibold'>{children}</h3>;
}

interface BillingPlanFormDialogProps {
  plan?: BillingPlan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillingPlanFormDialog({ plan, open, onOpenChange }: BillingPlanFormDialogProps) {
  const isEdit = !!plan;
  const features = useQuery(billingPlansQueryOptions()).data?.features ?? NO_FEATURES;
  const baseline = useStackBaseline();
  const [averageCompensation] = useAverageCompensation();

  const createMutation = useMutation({
    ...createBillingPlanMutation,
    onSuccess: (...args) => {
      createBillingPlanMutation.onSuccess?.(...args);
      toast.success('Plan created');
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => toast.error(saveErrorMessage(error))
  });

  const updateMutation = useMutation({
    ...updateBillingPlanMutation,
    onSuccess: (...args) => {
      updateBillingPlanMutation.onSuccess?.(...args);
      toast.success('Plan updated');
      onOpenChange(false);
    },
    onError: (error) => toast.error(saveErrorMessage(error))
  });

  const form = useAppForm({
    defaultValues: {
      name: plan?.name ?? '',
      description: plan?.description ?? '',
      status: plan?.status ?? 'draft',
      monthlyPrice: plan?.monthlyPrice ?? 0,
      annualPrice: plan?.annualPrice ?? undefined,
      expectedSubscribers: plan?.expectedSubscribers ?? 100,
      usagePct: plan?.usagePct ?? 100,
      limits: plan?.limits ?? {},
      customLimits: plan?.customLimits ?? [],
      featureIds: plan?.featureIds ?? []
    } as BillingPlanFormValues,
    validators: {
      onSubmit: billingPlanSchema
    },
    onSubmit: async ({ value }) => {
      const payload = toBillingPlanPayload(value);
      if (isEdit) {
        await updateMutation.mutateAsync({ id: plan.id, values: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90dvh] flex-col gap-4 sm:max-w-5xl'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit plan' : 'New plan'}</DialogTitle>
          <DialogDescription>
            Limits are per subscriber per month. The cost panel prices them with current service
            rates and splits the fixed maintenance cost across the expected subscribers.
          </DialogDescription>
        </DialogHeader>

        <div className='-mx-4 min-h-0 flex-1 overflow-y-auto px-4'>
          <div className='grid gap-6 md:grid-cols-[1fr_16rem]'>
            <form
              id='billing-plan-form-dialog'
              className='min-w-0 space-y-6'
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
            >
              <FieldGroup>
                <SectionTitle>Plan</SectionTitle>
                <div className='grid grid-cols-[1fr_10rem] gap-4'>
                  <form.AppField
                    name='name'
                    children={(field) => (
                      <field.TextField label='Name' required placeholder='Pro' />
                    )}
                  />
                  <form.AppField
                    name='status'
                    children={(field) => (
                      <field.SelectField label='Status' required options={statusOptions} />
                    )}
                  />
                </div>
                <form.AppField
                  name='description'
                  children={(field) => (
                    <field.TextareaField
                      label='Description'
                      rows={2}
                      maxLength={500}
                      placeholder='Who the plan is for'
                    />
                  )}
                />
              </FieldGroup>

              <FieldGroup>
                <SectionTitle>Pricing</SectionTitle>
                <div className='grid grid-cols-2 gap-4'>
                  <form.AppField
                    name='monthlyPrice'
                    children={(field) => (
                      <field.TextField
                        label='Monthly price (USD)'
                        required
                        type='number'
                        min={0}
                        step={0.01}
                      />
                    )}
                  />
                  <form.AppField
                    name='annualPrice'
                    children={(field) => (
                      <field.TextField
                        label='Annual price (USD)'
                        type='number'
                        min={0}
                        step={0.01}
                        description='Leave empty if the plan has no annual billing'
                      />
                    )}
                  />
                  <form.AppField
                    name='expectedSubscribers'
                    children={(field) => (
                      <field.TextField
                        label='Expected subscribers'
                        required
                        type='number'
                        min={1}
                        step={1}
                        description='Fixed costs are split across them'
                      />
                    )}
                  />
                  <form.AppField
                    name='usagePct'
                    children={(field) => (
                      <field.TextField
                        label='Average use of limits (%)'
                        required
                        type='number'
                        min={1}
                        max={100}
                        step={5}
                        description='Used when average compensation is on'
                      />
                    )}
                  />
                </div>
              </FieldGroup>

              <FieldGroup>
                <SectionTitle>Limits per month</SectionTitle>
                <div className='grid grid-cols-2 gap-4'>
                  {planLimits.map((limit) => (
                    <form.AppField
                      key={limit.id}
                      name={`limits.${limit.id}`}
                      children={(field) => (
                        <field.TextField
                          label={`${limit.label} (${limit.unit})`}
                          type='number'
                          min={0}
                          step={limit.step}
                          placeholder='Not included'
                          description={limit.description}
                        />
                      )}
                    />
                  ))}
                </div>

                <form.Field
                  name='customLimits'
                  mode='array'
                  children={(limitsField) => (
                    <div className='flex flex-col gap-3'>
                      <div className='flex items-center justify-between'>
                        <FieldLabel>Other limits</FieldLabel>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => limitsField.pushValue({ label: '', value: '' })}
                        >
                          <Icons.add className='mr-1 h-4 w-4' /> Add limit
                        </Button>
                      </div>
                      {limitsField.state.value.length ? null : (
                        <p className='text-muted-foreground text-xs'>
                          Limits without a maintenance cost, like projects or seats. They show on
                          the plan but don&apos;t change its cost.
                        </p>
                      )}
                      {limitsField.state.value.map((_, index) => (
                        <div key={index} className='flex items-start gap-2'>
                          <div className='grid flex-1 grid-cols-2 gap-3'>
                            <form.AppField
                              name={`customLimits[${index}].label`}
                              children={(field) => (
                                <field.TextField label='Label' required placeholder='Projects' />
                              )}
                            />
                            <form.AppField
                              name={`customLimits[${index}].value`}
                              children={(field) => (
                                <field.TextField label='Value' required placeholder='Unlimited' />
                              )}
                            />
                          </div>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='mt-6'
                            onClick={() => limitsField.removeValue(index)}
                            aria-label={`Remove limit ${index + 1}`}
                          >
                            <Icons.trash className='h-4 w-4' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                />
              </FieldGroup>

              <FieldGroup>
                <SectionTitle>Included features</SectionTitle>
                <form.Field
                  name='featureIds'
                  children={(field) => (
                    <FeaturePicker
                      features={features}
                      value={field.state.value}
                      onChange={field.handleChange}
                    />
                  )}
                />
              </FieldGroup>
            </form>

            <aside className='md:sticky md:top-0 md:self-start'>
              <div className='bg-muted/30 flex flex-col gap-3 rounded-lg border p-3'>
                <div className='flex items-baseline justify-between gap-2'>
                  <h3 className='text-sm font-semibold'>Maintenance cost</h3>
                  <span className='text-muted-foreground text-[11px]'>
                    {averageCompensation ? 'Average use' : 'Full limits'}
                  </span>
                </div>
                <form.Subscribe
                  selector={(state) => state.values}
                  children={(values) => {
                    if (baseline === null) {
                      return (
                        <p className='text-muted-foreground text-xs'>Loading service costs...</p>
                      );
                    }
                    const price = values.monthlyPrice ?? 0;
                    const usagePct = values.usagePct ?? 100;
                    const cost = planCost(
                      {
                        limits: values.limits,
                        usagePct,
                        averageCompensation,
                        expectedSubscribers: values.expectedSubscribers || 1,
                        monthlyPrice: price
                      },
                      baseline
                    );
                    const multiplier = averageCompensation
                      ? compensationMultiplier(usagePct)
                      : null;
                    return (
                      <>
                        <PlanCostSummary cost={cost} price={price} showBreakdown />
                        {multiplier ? (
                          <p className='text-muted-foreground text-[11px]'>
                            At {usagePct}% average use, limits can be {multiplier.toFixed(1)}x
                            bigger than at full use for the same cost.
                          </p>
                        ) : null}
                        <div className='flex flex-col gap-1.5 border-t pt-3'>
                          <span className='text-muted-foreground text-xs'>Suggested price</span>
                          {targetMargins.map((margin) => {
                            const suggested = priceForMargin(cost.totalCost, margin);
                            return (
                              <Button
                                key={margin}
                                type='button'
                                variant='outline'
                                size='sm'
                                className='justify-between'
                                onClick={() => form.setFieldValue('monthlyPrice', suggested)}
                              >
                                <span>{Math.round(margin * 100)}% margin</span>
                                <span className='tabular-nums'>{formatUsd(suggested)}</span>
                              </Button>
                            );
                          })}
                        </div>
                        <p className='text-muted-foreground text-[11px]'>
                          Fixed stack cost {formatUsd(baseline)}/mo with no usage.
                        </p>
                      </>
                    );
                  }}
                />
              </div>
            </aside>
          </div>
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={isPending} type='submit' form='billing-plan-form-dialog'>
            {isEdit ? 'Update plan' : 'Create plan'}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BillingPlanFormDialogTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' /> Add plan
      </Button>
      {/* Mounted only while open: its queries must not register in the cache during SSR,
          or HydrationBoundary defers hydrating the prefetched plans and the grid refetches. */}
      {open ? <BillingPlanFormDialog open onOpenChange={setOpen} /> : null}
    </>
  );
}
