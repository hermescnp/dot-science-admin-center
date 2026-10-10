'use client';

import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { billingPlansQueryOptions } from '@/features/billing-plans/api/queries';
import { useAppForm } from '@/lib/form';
import { updateUserMutation } from '../api/mutations';
import type { PlatformUser } from '../api/types';
import { NO_PLAN, userFormSchema, type UserFormValues } from '../schemas/user';
import { providerLabel } from './users-table/options';

const dateTimeFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

interface UserFormSheetProps {
  user: PlatformUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserFormSheet({ user, open, onOpenChange }: UserFormSheetProps) {
  const { data: billing } = useSuspenseQuery(billingPlansQueryOptions());
  const planOptions = [
    { value: NO_PLAN, label: 'No plan' },
    ...billing.plans.map((plan) => ({ value: plan.id, label: plan.name }))
  ];

  const mutation = useMutation({
    ...updateUserMutation,
    onSuccess: (...args) => {
      updateUserMutation.onSuccess?.(...args);
      toast.success('User updated');
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(
        error.message.includes('403')
          ? 'That change is not allowed.'
          : "Couldn't update the user. Try again."
      )
  });

  const form = useAppForm({
    defaultValues: {
      displayName: user.displayName ?? '',
      isPlatformAdmin: user.isPlatformAdmin,
      billingPlanId: user.billingPlan?.id ?? NO_PLAN
    } as UserFormValues,
    validators: {
      onSubmit: userFormSchema
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        id: user.id,
        values: {
          displayName: value.displayName.trim(),
          isPlatformAdmin: value.isPlatformAdmin,
          billingPlanId: value.billingPlanId === NO_PLAN ? null : value.billingPlanId
        }
      });
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>Edit user</SheetTitle>
          <SheetDescription>{user.email ?? 'No email on record'}</SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='user-form-sheet'
            className='space-y-6 p-4'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField
                name='displayName'
                children={(field) => <field.TextField label='Display name' required />}
              />

              <form.Field
                name='isPlatformAdmin'
                children={(field) => (
                  <Field orientation='horizontal'>
                    <FieldContent>
                      <FieldLabel htmlFor={field.name}>Platform admin</FieldLabel>
                      <FieldDescription>
                        {user.isSelf
                          ? "You can't change your own admin access."
                          : 'Grants access to this admin center.'}
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id={field.name}
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                      disabled={user.isSelf}
                    />
                  </Field>
                )}
              />

              <form.AppField
                name='billingPlanId'
                children={(field) => (
                  <field.SelectField label='Billing plan' options={planOptions} />
                )}
              />
            </FieldGroup>

            <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border p-4 text-sm'>
              <dt className='text-muted-foreground'>Sign-in</dt>
              <dd className='flex flex-wrap gap-1'>
                {user.providers.length
                  ? user.providers.map((provider) => (
                      <Badge key={provider} variant='secondary'>
                        {providerLabel(provider)}
                      </Badge>
                    ))
                  : '—'}
              </dd>
              <dt className='text-muted-foreground'>Email</dt>
              <dd>{user.emailVerified ? 'Verified' : 'Not verified'}</dd>
              <dt className='text-muted-foreground'>Last seen</dt>
              <dd>
                {user.lastSeenAt ? dateTimeFormat.format(new Date(user.lastSeenAt)) : 'Never'}
              </dd>
              <dt className='text-muted-foreground'>Last sign-in</dt>
              <dd>
                {user.lastSignInAt ? dateTimeFormat.format(new Date(user.lastSignInAt)) : 'Never'}
              </dd>
              <dt className='text-muted-foreground'>Joined</dt>
              <dd>{dateTimeFormat.format(new Date(user.createdAt))}</dd>
              <dt className='text-muted-foreground'>Locale</dt>
              <dd>{user.locale}</dd>
            </dl>
          </form>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={mutation.isPending} type='submit' form='user-form-sheet'>
            Save changes
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
