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
import { useAppForm } from '@/lib/form';
import {
  createExternalServiceItemMutation,
  updateExternalServiceItemMutation
} from '../api/mutations';
import type { ExternalServiceItem, ExternalServiceItemMutationPayload } from '../api/types';
import { currencyOptions, itemBillingCycleOptions, itemKindOptions } from '../constants/billing';
import {
  externalServiceItemFormSchema,
  toExternalServiceItemPayload,
  type ExternalServiceItemFormValues
} from '../schemas/external-service';

interface ExternalServiceItemFormSheetProps {
  serviceId: string;
  serviceLabel: string;
  /** Omit to add a new item. */
  item?: ExternalServiceItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExternalServiceItemFormSheet({
  serviceId,
  serviceLabel,
  item,
  open,
  onOpenChange
}: ExternalServiceItemFormSheetProps) {
  const onDone = (message: string) => {
    toast.success(message);
    onOpenChange(false);
  };
  const onError = () => toast.error("Couldn't save the item. Try again.");

  const createMutation = useMutation({
    ...createExternalServiceItemMutation,
    onSuccess: (...args) => {
      createExternalServiceItemMutation.onSuccess?.(...args);
      onDone(`Added to ${serviceLabel}`);
    },
    onError
  });
  const updateMutation = useMutation({
    ...updateExternalServiceItemMutation,
    onSuccess: (...args) => {
      updateExternalServiceItemMutation.onSuccess?.(...args);
      onDone(`${args[0].label} updated`);
    },
    onError
  });

  const save = (values: ExternalServiceItemMutationPayload) =>
    item
      ? updateMutation.mutateAsync({ id: item.id, values })
      : createMutation.mutateAsync({ serviceId, values });

  const form = useAppForm({
    defaultValues: {
      label: item?.label ?? '',
      kind: item?.kind ?? 'domain',
      billingCycle: item?.billingCycle ?? 'annual',
      amount: item?.amount,
      currency: item?.currency ?? 'USD',
      renewsOn: item?.renewsOn ? new Date(`${item.renewsOn}T00:00:00`) : undefined,
      notes: item?.notes ?? ''
    } as ExternalServiceItemFormValues,
    validators: {
      onSubmit: externalServiceItemFormSchema
    },
    onSubmit: async ({ value }) => {
      await save(toExternalServiceItemPayload(value));
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>{item ? `Edit ${item.label}` : `Add to ${serviceLabel}`}</SheetTitle>
          <SheetDescription>
            A domain, mailbox or seat billed under {serviceLabel}. Its cost adds to the
            service&apos;s total.
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='external-service-item-form-sheet'
            className='space-y-4 p-4'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField
                name='label'
                children={(field) => (
                  <field.TextField label='Name' required placeholder='example.com' />
                )}
              />

              <div className='grid grid-cols-2 gap-4'>
                <form.AppField
                  name='kind'
                  children={(field) => (
                    <field.SelectField label='Kind' required options={itemKindOptions} />
                  )}
                />
                <form.AppField
                  name='billingCycle'
                  children={(field) => (
                    <field.SelectField
                      label='Billing cycle'
                      required
                      options={itemBillingCycleOptions}
                    />
                  )}
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <form.AppField
                  name='amount'
                  children={(field) => (
                    <field.TextField
                      label='Amount'
                      required
                      type='number'
                      min={0}
                      step='0.01'
                      placeholder='0.00'
                    />
                  )}
                />
                <form.AppField
                  name='currency'
                  children={(field) => (
                    <field.SelectField label='Currency' required options={currencyOptions} />
                  )}
                />
              </div>

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
                    placeholder='Renewal price, minimum term…'
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
            loading={createMutation.isPending || updateMutation.isPending}
            type='submit'
            form='external-service-item-form-sheet'
          >
            {item ? 'Save item' : 'Add item'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
