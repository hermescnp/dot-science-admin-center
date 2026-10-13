'use client';

import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
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
import { cn } from '@/lib/utils';
import { createEventMutation, deleteEventMutation, updateEventMutation } from '../api/mutations';
import { eventColors, type CalendarEvent } from '../api/types';
import { eventColorLabels, eventColorSwatches } from '../constants/colors';
import { eventFormSchema, toEventPayload, type EventFormValues } from '../schemas/event';

/** Start of a new event, usually the slot that was clicked. */
export interface EventDraft {
  date: Date;
  startTime: string;
  endTime: string;
}

function defaultValues(event: CalendarEvent | null, draft: EventDraft): EventFormValues {
  if (!event) {
    return {
      title: '',
      date: draft.date,
      allDay: false,
      startTime: draft.startTime,
      endTime: draft.endTime,
      color: 'blue',
      location: '',
      description: ''
    };
  }
  const start = new Date(event.startAt);
  return {
    title: event.title,
    date: start,
    allDay: event.allDay,
    startTime: event.allDay ? draft.startTime : format(start, 'HH:mm'),
    endTime: event.allDay ? draft.endTime : format(new Date(event.endAt), 'HH:mm'),
    color: event.color,
    location: event.location ?? '',
    description: event.description
  };
}

interface EventSheetProps {
  /** Null when creating an event. */
  event: CalendarEvent | null;
  draft: EventDraft;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventSheet({ event, draft, open, onOpenChange }: EventSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const createMutation = useMutation({
    ...createEventMutation,
    onSuccess: (...args) => {
      createEventMutation.onSuccess?.(...args);
      toast.success('Event created');
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't create the event. Try again.")
  });

  const updateMutation = useMutation({
    ...updateEventMutation,
    onSuccess: (...args) => {
      updateEventMutation.onSuccess?.(...args);
      toast.success('Event updated');
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't update the event. Try again.")
  });

  const deleteMutation = useMutation({
    ...deleteEventMutation,
    onSuccess: (...args) => {
      deleteEventMutation.onSuccess?.(...args);
      toast.success('Event deleted');
      setDeleteOpen(false);
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't delete the event")
  });

  const form = useAppForm({
    defaultValues: defaultValues(event, draft),
    validators: {
      onSubmit: eventFormSchema
    },
    onSubmit: async ({ value }) => {
      const values = toEventPayload(value);
      if (event) {
        await updateMutation.mutateAsync({ id: event.id, values });
      } else {
        await createMutation.mutateAsync(values);
      }
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col sm:max-w-md'>
        <SheetHeader>
          <SheetTitle>{event ? event.title : 'New event'}</SheetTitle>
          <SheetDescription>
            {event ? 'Edit the event details.' : 'Add an event to the team calendar.'}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto p-4'>
          <form
            id='event-form-sheet'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField
                name='title'
                children={(field) => (
                  <field.TextField label='Title' required placeholder='Weekly sync' />
                )}
              />
              <form.AppField
                name='date'
                children={(field) => <field.DatePickerField label='Date' required />}
              />
              <form.AppField
                name='allDay'
                children={(field) => <field.SwitchField label='All day' />}
              />
              <form.Subscribe
                selector={(state) => state.values.allDay}
                children={(allDay) =>
                  allDay ? null : (
                    <div className='grid grid-cols-2 gap-4'>
                      <form.AppField
                        name='startTime'
                        children={(field) => (
                          <field.TextField label='Starts' type='time' required />
                        )}
                      />
                      <form.AppField
                        name='endTime'
                        children={(field) => <field.TextField label='Ends' type='time' required />}
                      />
                    </div>
                  )
                }
              />
              <form.Field
                name='color'
                children={(field) => (
                  <Field>
                    <FieldLabel id='event-color-label'>Color</FieldLabel>
                    <div
                      role='radiogroup'
                      aria-labelledby='event-color-label'
                      className='flex gap-2'
                    >
                      {eventColors.map((color) => {
                        const selected = field.state.value === color;
                        return (
                          <button
                            key={color}
                            type='button'
                            role='radio'
                            aria-checked={selected}
                            aria-label={eventColorLabels[color]}
                            title={eventColorLabels[color]}
                            onClick={() => field.handleChange(color)}
                            className={cn(
                              'ring-offset-background focus-visible:ring-ring flex size-7 items-center justify-center rounded-full transition-shadow focus-visible:ring-2 focus-visible:outline-none',
                              eventColorSwatches[color],
                              selected && 'ring-foreground ring-2 ring-offset-2'
                            )}
                          >
                            {selected ? <Icons.check className='size-4 text-white' /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                )}
              />
              <form.AppField
                name='location'
                children={(field) => (
                  <field.TextField label='Location' placeholder='Virtual office, room or link' />
                )}
              />
              <form.AppField
                name='description'
                children={(field) => (
                  <field.TextareaField
                    label='Description'
                    rows={5}
                    maxLength={5000}
                    placeholder='Agenda, notes or links'
                  />
                )}
              />
            </FieldGroup>
          </form>
        </div>

        <SheetFooter className='flex-row'>
          {event ? (
            <Button
              type='button'
              variant='ghost'
              className='text-destructive hover:text-destructive mr-auto'
              onClick={() => setDeleteOpen(true)}
            >
              <Icons.trash className='mr-1 h-4 w-4' /> Delete
            </Button>
          ) : null}
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <LoadingButton loading={isPending} type='submit' form='event-form-sheet'>
            {event ? 'Save changes' : 'Create event'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
      {event ? (
        <AlertModal
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => deleteMutation.mutate(event.id)}
          loading={deleteMutation.isPending}
          title={`Delete ${event.title}?`}
          description='The event is removed from the calendar for everyone.'
          confirmLabel='Delete'
        />
      ) : null}
    </Sheet>
  );
}
