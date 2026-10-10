'use client';

import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import {
  createFeatureSubtaskMutation,
  deleteFeatureSubtaskMutation,
  updateFeatureSubtaskMutation
} from '@/features/feature-subtasks/api/mutations';
import { featureSubtasksQueryOptions } from '@/features/feature-subtasks/api/queries';
import type { FeatureSubtask } from '@/features/feature-subtasks/api/types';
import type { PlatformFeature } from '@/features/platform-features/api/types';
import {
  FeatureIcon,
  FeatureStatusBadge,
  ServiceBadges
} from '@/features/platform-features/components/feature-display';
import { PlatformFeatureFormSheet } from '@/features/platform-features/components/platform-feature-form-sheet';
import { platformNodesById, sectionLabels } from '@/features/platform-features/constants/options';
import { cn } from '@/lib/utils';

interface FeatureTaskSheetProps {
  feature: PlatformFeature | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeatureTaskSheet({ feature, open, onOpenChange }: FeatureTaskSheetProps) {
  const [editing, setEditing] = useState(false);
  const platform = feature ? platformNodesById.get(feature.platformId) : undefined;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className='flex flex-col sm:max-w-lg'>
          {feature ? (
            <>
              <SheetHeader className='gap-3'>
                <div className='flex items-start gap-3'>
                  <FeatureIcon icon={feature.icon} className='size-10' />
                  <div className='flex min-w-0 flex-col gap-1.5'>
                    <SheetTitle className='leading-snug'>{feature.name}</SheetTitle>
                    <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-xs'>
                      <FeatureStatusBadge status={feature.status} />
                      <span>
                        {platform?.data.label ?? feature.platformId} ·{' '}
                        {sectionLabels.get(feature.section) ?? feature.section}
                      </span>
                    </div>
                  </div>
                </div>
                <SheetDescription>{feature.description}</SheetDescription>
                <ServiceBadges services={feature.services} />
              </SheetHeader>

              <div className='flex-1 overflow-y-auto px-4'>
                <SubtaskChecklist featureId={feature.id} />
              </div>

              <SheetFooter>
                <Button variant='outline' onClick={() => setEditing(true)}>
                  <Icons.edit className='mr-2 size-4' /> Edit feature
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      {feature ? (
        <PlatformFeatureFormSheet feature={feature} open={editing} onOpenChange={setEditing} />
      ) : null}
    </>
  );
}

function SubtaskChecklist({ featureId }: { featureId: string }) {
  const { data } = useSuspenseQuery(featureSubtasksQueryOptions());
  const subtasks = data.filter((subtask) => subtask.featureId === featureId);
  const done = subtasks.filter((subtask) => subtask.done).length;

  return (
    <section className='flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold'>Subtasks</h3>
        {subtasks.length ? (
          <span className='text-muted-foreground text-xs tabular-nums'>
            {done}/{subtasks.length} done
          </span>
        ) : null}
      </div>
      {subtasks.length ? (
        <div className='bg-muted h-1.5 overflow-hidden rounded-full'>
          <div
            className='bg-primary h-full rounded-full transition-[width]'
            style={{ width: `${(done / subtasks.length) * 100}%` }}
          />
        </div>
      ) : null}
      <ul className='flex flex-col gap-1'>
        {subtasks.map((subtask) => (
          <SubtaskRow key={subtask.id} subtask={subtask} />
        ))}
      </ul>
      <AddSubtaskInput featureId={featureId} />
    </section>
  );
}

function SubtaskRow({ subtask }: { subtask: FeatureSubtask }) {
  const updateMutation = useMutation(updateFeatureSubtaskMutation);
  const deleteMutation = useMutation(deleteFeatureSubtaskMutation);
  const checkboxId = `subtask-${subtask.id}`;

  return (
    <li className='group hover:bg-muted/50 flex items-center gap-2.5 rounded-md px-2 py-1.5'>
      <Checkbox
        id={checkboxId}
        checked={subtask.done}
        onCheckedChange={(checked) =>
          updateMutation.mutate(
            { id: subtask.id, values: { done: checked } },
            {
              onError: () => toast.error("Couldn't update the subtask. Try again.")
            }
          )
        }
      />
      <label
        htmlFor={checkboxId}
        className={cn('flex-1 text-sm', subtask.done && 'text-muted-foreground line-through')}
      >
        {subtask.title}
      </label>
      <Button
        variant='ghost'
        size='icon'
        className='size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
        aria-label={`Delete ${subtask.title}`}
        onClick={() =>
          deleteMutation.mutate(subtask.id, {
            onError: () => toast.error("Couldn't delete the subtask. Try again.")
          })
        }
      >
        <Icons.trash className='size-3.5' />
      </Button>
    </li>
  );
}

function AddSubtaskInput({ featureId }: { featureId: string }) {
  const [title, setTitle] = useState('');
  const createMutation = useMutation(createFeatureSubtaskMutation);

  function addSubtask() {
    const trimmed = title.trim();
    if (!trimmed || createMutation.isPending) return;
    createMutation.mutate(
      { featureId, title: trimmed },
      {
        onSuccess: () => setTitle(''),
        onError: () => toast.error("Couldn't add the subtask. Try again.")
      }
    );
  }

  return (
    <div className='flex items-center gap-2'>
      <Input
        value={title}
        maxLength={160}
        placeholder='Add a subtask…'
        aria-label='New subtask'
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            addSubtask();
          }
        }}
      />
      <Button
        variant='outline'
        size='icon'
        aria-label='Add subtask'
        disabled={!title.trim() || createMutation.isPending}
        onClick={addSubtask}
      >
        <Icons.add className='size-4' />
      </Button>
    </div>
  );
}
