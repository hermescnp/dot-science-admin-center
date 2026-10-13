'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useAppForm } from '@/lib/form';
import { knowledgeBaseKeys } from '../api/queries';
import { createSection } from '../api/service';
import { createSectionSchema } from '../api/types';

interface NewSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewSectionDialog({ open, onOpenChange }: NewSectionDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createSection,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      toast.success('Section created');
      onOpenChange(false);
      form.reset();
    },
    onError: () => toast.error("Couldn't create the section")
  });

  const form = useAppForm({
    defaultValues: { title: '' },
    validators: { onSubmit: createSectionSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value).catch(() => undefined);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <form
          className='flex flex-col gap-4'
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>New section</DialogTitle>
            <DialogDescription>Sections group related layers in the left panel.</DialogDescription>
          </DialogHeader>
          <form.AppField
            name='title'
            children={(field) => (
              <field.TextField label='Title' required maxLength={80} autoFocus />
            )}
          />
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <form.AppForm>
              <form.SubmitButton>Create section</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
