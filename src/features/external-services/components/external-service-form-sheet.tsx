'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { servicePlans } from '@/features/architecture/data/service-plans';
import { useAppForm } from '@/lib/form';
import { updateExternalServiceMutation } from '../api/mutations';
import type { ExternalService } from '../api/types';
import { billingCycleOptions, currencyOptions } from '../constants/billing';
import {
  AUTO_PLAN,
  externalServiceFormSchema,
  toExternalServicePayload,
  type ExternalServiceFormValues
} from '../schemas/external-service';

interface ExternalServiceFormSheetProps {
  service: ExternalService;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExternalServiceFormSheet({
  service,
  label,
  open,
  onOpenChange
}: ExternalServiceFormSheetProps) {
  const plans = servicePlans[service.id]?.plans ?? [];
  const planOptions = [
    { value: AUTO_PLAN, label: 'Auto (detected or default)' },
    ...plans.map((plan) => ({ value: plan.id, label: `${plan.name} (${plan.price})` }))
  ];

  const mutation = useMutation({
    ...updateExternalServiceMutation,
    onSuccess: (...args) => {
      updateExternalServiceMutation.onSuccess?.(...args);
      toast.success(`${label} billing updated`);
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't save the billing details. Try again.")
  });

  const form = useAppForm({
    defaultValues: {
      planId: service.planId ?? AUTO_PLAN,
      billingCycle: service.billingCycle,
      monthlyCost: service.monthlyCost ?? undefined,
      annualCost: service.annualCost ?? undefined,
      currency: service.currency,
      renewsOn: service.renewsOn ? new Date(`${service.renewsOn}T00:00:00`) : undefined,
      notes: service.notes
    } as ExternalServiceFormValues,
    validators: {
      onSubmit: externalServiceFormSchema
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ id: service.id, values: toExternalServicePayload(value) });
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>{label} billing</SheetTitle>
          <SheetDescription>
            What we pay for this service. The plan also shows in its dialog on the architecture map.
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='external-service-form-sheet'
            className='space-y-4 p-4'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              {plans.length ? (
                <form.AppField
                  name='planId'
                  children={(field) => (
                    <field.SelectField
                      label='Plan'
                      description='Auto uses the plan detected from the provider API, or the catalog default.'
                      options={planOptions}
                    />
                  )}
                />
              ) : null}

              <form.AppField
                name='billingCycle'
                children={(field) => (
                  <field.SelectField label='Billing cycle' required options={billingCycleOptions} />
                )}
              />

              {service.items.length ? (
                <p className='text-muted-foreground rounded-md border border-dashed p-3 text-sm'>
                  The cost comes from this service&apos;s {service.items.length} domains and
                  mailboxes. Edit them from the table rows.
                </p>
              ) : (
                <>
                  <form.AppField
                    name='currency'
                    children={(field) => (
                      <field.SelectField label='Currency' required options={currencyOptions} />
                    )}
                  />
                  <div className='grid grid-cols-2 gap-4'>
                    <form.AppField
                      name='monthlyCost'
                      children={(field) => (
                        <field.TextField
                          label='Monthly cost'
                          type='number'
                          min={0}
                          step='0.01'
                          placeholder='0.00'
                        />
                      )}
                    />
                    <form.AppField
                      name='annualCost'
                      children={(field) => (
                        <field.TextField
                          label='Annual cost'
                          type='number'
                          min={0}
                          step='0.01'
                          placeholder='Monthly x 12'
                        />
                      )}
                    />
                  </div>
                </>
              )}

              <form.AppField
                name='renewsOn'
                children={(field) => <field.DatePickerField label='Renews on' />}
              />

              <form.AppField
                name='notes'
                children={(field) => (
                  <field.TextareaField
                    label='Notes'
                    rows={3}
                    maxLength={500}
                    showCount
                    placeholder='Billing account, card, discounts…'
                  />
                )}
              />
            </FieldGroup>
          </form>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton
            loading={mutation.isPending}
            type='submit'
            form='external-service-form-sheet'
          >
            Save billing
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
