'use client';

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
import { sectionTitleSchema } from '../api/types';

interface TitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  initialValue?: string;
  maxLength: number;
  onSubmit: (title: string) => Promise<unknown>;
}

export function TitleDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  initialValue = '',
  maxLength,
  onSubmit
}: TitleDialogProps) {
  const form = useAppForm({
    defaultValues: { title: initialValue },
    validators: {
      onSubmit: sectionTitleSchema.extend({
        title: sectionTitleSchema.shape.title.max(
          maxLength,
          `Keep it under ${maxLength} characters`
        )
      })
    },
    onSubmit: async ({ value }) => {
      const ok = await onSubmit(value.title.trim()).then(
        () => true,
        () => false
      );
      if (ok) onOpenChange(false);
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
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form.AppField
            name='title'
            children={(field) => (
              <field.TextField label='Title' required maxLength={maxLength} autoFocus />
            )}
          />
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <form.AppForm>
              <form.SubmitButton>{submitLabel}</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
