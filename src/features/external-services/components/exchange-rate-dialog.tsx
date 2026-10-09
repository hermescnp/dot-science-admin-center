'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import * as z from 'zod';
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
import { FieldGroup } from '@/components/ui/field';
import { LoadingButton } from '@/components/ui/loading-button';
import { useAppForm } from '@/lib/form';
import { updateCurrencyRateMutation } from '../api/mutations';
import { externalServicesQueryOptions } from '../api/queries';

const rateFormSchema = z.object({
  usdRate: z.number('Enter a rate').positive('Must be more than 0').max(1000)
});

export function ExchangeRateButton() {
  const [open, setOpen] = useState(false);
  const { data } = useQuery(externalServicesQueryOptions());
  const rate = data?.rates.CAD;

  return (
    <>
      <Button variant='outline' size='sm' onClick={() => setOpen(true)} disabled={!rate}>
        <Icons.arrowsExchange className='mr-2 h-4 w-4' />
        {rate ? `1 CAD = ${rate} USD` : 'Exchange rate'}
      </Button>
      {open && rate ? <ExchangeRateDialog rate={rate} onOpenChange={setOpen} /> : null}
    </>
  );
}

function ExchangeRateDialog({
  rate,
  onOpenChange
}: {
  rate: number;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useMutation({
    ...updateCurrencyRateMutation,
    onSuccess: (...args) => {
      updateCurrencyRateMutation.onSuccess?.(...args);
      toast.success('Exchange rate updated');
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't save the exchange rate. Try again.")
  });

  const form = useAppForm({
    defaultValues: { usdRate: rate } as z.infer<typeof rateFormSchema>,
    validators: { onSubmit: rateFormSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ currency: 'CAD', usdRate: value.usdRate });
    }
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>CAD to USD rate</DialogTitle>
          <DialogDescription>
            CAD amounts are shown as billed and converted to USD with this rate for the totals.
          </DialogDescription>
        </DialogHeader>
        <form
          id='exchange-rate-form'
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.AppField
              name='usdRate'
              children={(field) => (
                <field.TextField
                  label='USD per 1 CAD'
                  required
                  type='number'
                  min={0}
                  step='0.0001'
                />
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={mutation.isPending} type='submit' form='exchange-rate-form'>
            Save rate
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
