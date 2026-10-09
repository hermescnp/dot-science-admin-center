'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
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
import { createPlatformFeatureMutation, updatePlatformFeatureMutation } from '../api/mutations';
import type { PlatformFeature } from '../api/types';
import {
  platformFeatureSections,
  platformOptions,
  serviceOptions,
  statusOptions
} from '../constants/options';
import { platformFeatureSchema, type PlatformFeatureFormValues } from '../schemas/platform-feature';

const iconOptions = Object.keys(Icons).map((key) => ({ value: key, label: key }));

function saveErrorMessage(error: Error) {
  return error.message.includes('409')
    ? 'That platform already has a feature with this name.'
    : "Couldn't save the feature. Try again.";
}

interface PlatformFeatureFormSheetProps {
  feature?: PlatformFeature;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlatformFeatureFormSheet({
  feature,
  open,
  onOpenChange
}: PlatformFeatureFormSheetProps) {
  const isEdit = !!feature;

  const createMutation = useMutation({
    ...createPlatformFeatureMutation,
    onSuccess: (...args) => {
      createPlatformFeatureMutation.onSuccess?.(...args);
      toast.success('Feature created');
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => toast.error(saveErrorMessage(error))
  });

  const updateMutation = useMutation({
    ...updatePlatformFeatureMutation,
    onSuccess: (...args) => {
      updatePlatformFeatureMutation.onSuccess?.(...args);
      toast.success('Feature updated');
      onOpenChange(false);
    },
    onError: (error) => toast.error(saveErrorMessage(error))
  });

  const form = useAppForm({
    defaultValues: {
      platformId: feature?.platformId ?? '',
      section: feature?.section ?? 'general',
      name: feature?.name ?? '',
      description: feature?.description ?? '',
      icon: feature?.icon ?? '',
      services: feature?.services ?? [],
      status: feature?.status ?? 'planned'
    } as PlatformFeatureFormValues,
    validators: {
      onSubmit: platformFeatureSchema
    },
    onSubmit: async ({ value }) => {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: feature.id, values: value });
      } else {
        await createMutation.mutateAsync(value);
      }
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit feature' : 'New feature'}</SheetTitle>
          <SheetDescription>
            Changes show up here and in the platform details on the architecture map.
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='platform-feature-form-sheet'
            className='space-y-4 p-4'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <div className='grid grid-cols-2 gap-4'>
                <form.AppField
                  name='platformId'
                  children={(field) => (
                    <field.SelectField
                      label='Platform'
                      required
                      options={platformOptions}
                      placeholder='Select platform'
                    />
                  )}
                />
                <form.AppField
                  name='section'
                  children={(field) => (
                    <field.SelectField
                      label='Section'
                      required
                      options={platformFeatureSections}
                      placeholder='Select section'
                    />
                  )}
                />
              </div>

              <form.AppField
                name='name'
                children={(field) => (
                  <field.TextField label='Name' required placeholder='Document editor' />
                )}
              />

              <form.AppField
                name='status'
                children={(field) => (
                  <field.SelectField
                    label='Development status'
                    required
                    options={statusOptions}
                    placeholder='Select status'
                  />
                )}
              />

              <form.AppField
                name='description'
                children={(field) => (
                  <field.TextareaField
                    label='Description'
                    required
                    rows={3}
                    maxLength={240}
                    showCount
                    placeholder='What the functionality does, in one line'
                  />
                )}
              />

              <form.AppField
                name='icon'
                children={(field) => (
                  <field.ComboboxField
                    label='Icon'
                    required
                    options={iconOptions}
                    placeholder='Select icon'
                    searchPlaceholder='Search icons...'
                  />
                )}
              />

              <form.AppField
                name='services'
                mode='array'
                children={(field) => (
                  <field.CheckboxGroupField
                    label='Services used'
                    options={serviceOptions}
                    className='grid grid-cols-2 gap-3'
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
          <LoadingButton loading={isPending} type='submit' form='platform-feature-form-sheet'>
            {isEdit ? 'Update feature' : 'Create feature'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function PlatformFeatureFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' /> Add feature
      </Button>
      <PlatformFeatureFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
