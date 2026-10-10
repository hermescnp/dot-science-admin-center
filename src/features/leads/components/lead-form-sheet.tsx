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
import { updateLeadMutation } from '../api/mutations';
import type { Lead } from '../api/types';
import {
  leadEmailStatusesByValue,
  leadSourceLabels,
  leadStatusOptions
} from '../constants/options';
import { leadFormSchema, type LeadFormValues } from '../schemas/lead';
import { LeadEmailStatusIcon, leadEmailStatusDescription, LeadSessionList } from './lead-display';

const dateTimeFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });
const statusSelectOptions = leadStatusOptions.map(({ value, label }) => ({ value, label }));

interface LeadFormSheetProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadFormSheet({ lead, open, onOpenChange }: LeadFormSheetProps) {
  const mutation = useMutation({
    ...updateLeadMutation,
    onSuccess: (...args) => {
      updateLeadMutation.onSuccess?.(...args);
      toast.success('Lead updated');
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't update the lead. Try again.")
  });

  const form = useAppForm({
    defaultValues: { status: lead.status, notes: lead.notes } as LeadFormValues,
    validators: {
      onSubmit: leadFormSchema
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({ id: lead.id, values: value });
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>{lead.name ?? lead.email}</SheetTitle>
          <SheetDescription>
            <a href={`mailto:${lead.email}`} className='hover:underline'>
              {lead.email}
            </a>
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='lead-form-sheet'
            className='space-y-6 p-4'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField
                name='status'
                children={(field) => (
                  <field.SelectField label='Status' required options={statusSelectOptions} />
                )}
              />
              <form.AppField
                name='notes'
                children={(field) => (
                  <field.TextareaField
                    label='Notes'
                    rows={6}
                    maxLength={4000}
                    showCount
                    placeholder='Conversations, interests, next steps'
                  />
                )}
              />
            </FieldGroup>

            <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border p-4 text-sm'>
              <dt className='text-muted-foreground'>Email</dt>
              <dd className='flex items-start gap-2'>
                <LeadEmailStatusIcon status={lead.emailStatus} className='mt-0.5' />
                <span>
                  {leadEmailStatusesByValue.get(lead.emailStatus)?.label}
                  <span className='text-muted-foreground block text-xs'>
                    {leadEmailStatusDescription(lead)}
                  </span>
                </span>
              </dd>
              <dt className='text-muted-foreground'>Source</dt>
              <dd>{leadSourceLabels.get(lead.source) ?? lead.source}</dd>
              <dt className='text-muted-foreground'>First captured</dt>
              <dd>{dateTimeFormat.format(new Date(lead.firstCapturedAt))}</dd>
              <dt className='text-muted-foreground'>Last captured</dt>
              <dd>{dateTimeFormat.format(new Date(lead.lastCapturedAt))}</dd>
            </dl>

            <div className='flex flex-col gap-2'>
              <h3 className='text-sm font-medium'>IAteneo sessions ({lead.sessions.length})</h3>
              {lead.sessions.length ? (
                <div className='rounded-lg border p-4 text-sm'>
                  <LeadSessionList sessions={lead.sessions} />
                </div>
              ) : (
                <p className='text-muted-foreground text-sm'>No sessions found.</p>
              )}
            </div>
          </form>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={mutation.isPending} type='submit' form='lead-form-sheet'>
            Save changes
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
