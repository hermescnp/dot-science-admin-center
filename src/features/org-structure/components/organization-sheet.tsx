'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { LoadingButton } from '@/components/ui/loading-button';
import { Separator } from '@/components/ui/separator';
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
  removeOrgProfileImageMutation,
  updateOrgProfileMutation,
  uploadOrgProfileImageMutation
} from '../api/mutations';
import { orgProfileQueryOptions } from '../api/queries';
import type { OrgProfile } from '../api/types';
import { orgProfileSchema } from '../schemas/department';
import { ZoneImage } from './zone-image';

interface OrganizationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationSheet({ open, onOpenChange }: OrganizationSheetProps) {
  const { data: profile, isPending, isError } = useQuery(orgProfileQueryOptions());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>Dot Science</SheetTitle>
          <SheetDescription>
            The organization itself, presented in the main space of the virtual office.
          </SheetDescription>
        </SheetHeader>
        {profile ? (
          <OrganizationForm profile={profile} onClose={() => onOpenChange(false)} />
        ) : (
          <div className='text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm'>
            {isPending ? <Icons.spinner className='size-4 animate-spin' /> : null}
            {isError ? "Couldn't load the organization." : 'Loading...'}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function OrganizationForm({ profile, onClose }: { profile: OrgProfile; onClose: () => void }) {
  const updateMutation = useMutation({
    ...updateOrgProfileMutation,
    onSuccess: (...args) => {
      updateOrgProfileMutation.onSuccess?.(...args);
      toast.success('Organization updated');
    },
    onError: () => toast.error("Couldn't save the organization. Try again.")
  });

  const uploadMutation = useMutation({
    ...uploadOrgProfileImageMutation,
    onSuccess: (...args) => {
      uploadOrgProfileImageMutation.onSuccess?.(...args);
      toast.success('Image updated');
    },
    onError: () => toast.error("Couldn't upload the image. Try again.")
  });

  const removeMutation = useMutation({
    ...removeOrgProfileImageMutation,
    onSuccess: (...args) => {
      removeOrgProfileImageMutation.onSuccess?.(...args);
      toast.success('Image removed');
    },
    onError: () => toast.error("Couldn't remove the image")
  });

  const form = useAppForm({
    defaultValues: { longDescription: profile.longDescription },
    validators: {
      onSubmit: orgProfileSchema
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync(orgProfileSchema.parse(value));
    }
  });

  return (
    <>
      <div className='flex-1 space-y-6 overflow-auto p-4'>
        <form
          id='organization-form-sheet'
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.AppField
              name='longDescription'
              children={(field) => (
                <field.TextareaField
                  label='Long description (Markdown)'
                  description='Shown as the main space documentation in the virtual office.'
                  rows={14}
                  className='max-h-[28rem] font-mono text-xs'
                  maxLength={10000}
                  showCount
                  placeholder='A presentation of Dot Science'
                />
              )}
            />
          </FieldGroup>
        </form>
        <Separator />
        <ZoneImage
          imageUrl={profile.imageUrl}
          alt='Dot Science'
          zoneKey={profile.zoneKey}
          onUpload={(file) => uploadMutation.mutate(file)}
          uploading={uploadMutation.isPending}
          onRemove={() => removeMutation.mutate()}
          removing={removeMutation.isPending}
        />
      </div>
      <SheetFooter className='flex-row justify-end'>
        <Button type='button' variant='outline' onClick={onClose}>
          Close
        </Button>
        <LoadingButton
          loading={updateMutation.isPending}
          type='submit'
          form='organization-form-sheet'
        >
          Save changes
        </LoadingButton>
      </SheetFooter>
    </>
  );
}
