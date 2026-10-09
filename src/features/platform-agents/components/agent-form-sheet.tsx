'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { FieldGroup, FieldLabel } from '@/components/ui/field';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import {
  platformOptions,
  serviceOptions,
  statusOptions
} from '@/features/platform-features/constants/options';
import { useAppForm } from '@/lib/form';
import { createPlatformAgentMutation, updatePlatformAgentMutation } from '../api/mutations';
import type { PlatformAgent } from '../api/types';
import { agentKindOptions, modelRoleOptions } from '../constants/options';
import {
  NO_MODEL_SERVICE,
  platformAgentSchema,
  type PlatformAgentFormValues
} from '../schemas/platform-agent';

const iconOptions = Object.keys(Icons).map((key) => ({
  value: key,
  label: key
}));
const modelServiceOptions = [{ value: NO_MODEL_SERVICE, label: 'No service' }, ...serviceOptions];

function saveErrorMessage(error: Error) {
  return error.message.includes('409')
    ? 'An agent with this name already exists.'
    : "Couldn't save the agent. Try again.";
}

interface AgentFormSheetProps {
  agent?: PlatformAgent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentFormSheet({ agent, open, onOpenChange }: AgentFormSheetProps) {
  const isEdit = !!agent;

  const createMutation = useMutation({
    ...createPlatformAgentMutation,
    onSuccess: (...args) => {
      createPlatformAgentMutation.onSuccess?.(...args);
      toast.success('Agent created');
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => toast.error(saveErrorMessage(error))
  });

  const updateMutation = useMutation({
    ...updatePlatformAgentMutation,
    onSuccess: (...args) => {
      updatePlatformAgentMutation.onSuccess?.(...args);
      toast.success('Agent updated');
      onOpenChange(false);
    },
    onError: (error) => toast.error(saveErrorMessage(error))
  });

  const form = useAppForm({
    defaultValues: {
      platformId: agent?.platformId ?? '',
      kind: agent?.kind ?? 'agent',
      status: agent?.status ?? 'planned',
      name: agent?.name ?? '',
      archetypeTitle: agent?.archetype.title ?? '',
      archetypeIcon: agent?.archetype.icon ?? 'robot',
      purpose: agent?.purpose ?? '',
      runtime: agent?.runtime ?? '',
      entry: agent?.entry ?? '',
      repo: agent?.repo ?? '',
      models: (agent?.models ?? []).map((model) => ({
        ...model,
        nodeId: model.nodeId ?? NO_MODEL_SERVICE
      })),
      modelNote: agent?.modelNote ?? '',
      temperature: agent?.temperature,
      memory: agent?.memory ?? ''
    } as PlatformAgentFormValues,
    validators: {
      onSubmit: platformAgentSchema
    },
    onSubmit: async ({ value }) => {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: agent.id, values: value });
      } else {
        await createMutation.mutateAsync(value);
      }
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit agent' : 'New agent'}</SheetTitle>
          <SheetDescription>
            Changes show up here and in the agent profile on the architecture map. Context, tools,
            guardrails, checkpoints and outputs keep their stored values.
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='agent-form-sheet'
            className='space-y-4 p-4'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <div className='grid grid-cols-3 gap-4'>
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
                  name='kind'
                  children={(field) => (
                    <field.SelectField label='Kind' required options={agentKindOptions} />
                  )}
                />
                <form.AppField
                  name='status'
                  children={(field) => (
                    <field.SelectField label='Status' required options={statusOptions} />
                  )}
                />
              </div>

              <form.AppField
                name='name'
                children={(field) => (
                  <field.TextField label='Name' required placeholder='Request router' />
                )}
              />

              <div className='grid grid-cols-2 gap-4'>
                <form.AppField
                  name='archetypeTitle'
                  children={(field) => (
                    <field.TextField label='Pattern' required placeholder='Tool-calling agent' />
                  )}
                />
                <form.AppField
                  name='archetypeIcon'
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
              </div>

              <form.AppField
                name='purpose'
                children={(field) => (
                  <field.TextareaField
                    label='Purpose'
                    required
                    rows={3}
                    maxLength={400}
                    showCount
                    placeholder='What the agent does, in a sentence or two'
                  />
                )}
              />

              <form.AppField
                name='runtime'
                children={(field) => (
                  <field.TextField
                    label='Runtime'
                    required
                    placeholder='LangGraph · Node runtime · 120s max'
                  />
                )}
              />

              <div className='grid grid-cols-2 gap-4'>
                <form.AppField
                  name='entry'
                  children={(field) => (
                    <field.TextField label='Entry point' placeholder='POST /api/agent/chat' />
                  )}
                />
                <form.AppField
                  name='repo'
                  children={(field) => (
                    <field.TextField label='Repository' required placeholder='golden-papers-ai' />
                  )}
                />
              </div>

              <form.Field
                name='models'
                mode='array'
                children={(modelsField) => (
                  <div className='flex flex-col gap-3'>
                    <div className='flex items-center justify-between'>
                      <FieldLabel>Models</FieldLabel>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          modelsField.pushValue({
                            slug: '',
                            role: modelsField.state.value.length ? 'fallback' : 'primary',
                            nodeId: NO_MODEL_SERVICE
                          })
                        }
                      >
                        <Icons.add className='mr-1 h-4 w-4' /> Add model
                      </Button>
                    </div>
                    {modelsField.state.value.length ? null : (
                      <p className='text-muted-foreground text-xs'>
                        No models: the agent runs deterministic code.
                      </p>
                    )}
                    {modelsField.state.value.map((_, index) => (
                      <div key={index} className='flex gap-2 rounded-lg border p-3'>
                        <div className='flex flex-1 flex-col gap-3'>
                          <form.AppField
                            name={`models[${index}].slug`}
                            children={(field) => (
                              <field.TextField
                                label='Slug'
                                required
                                placeholder='google/gemini-3.5-flash'
                              />
                            )}
                          />
                          <div className='grid grid-cols-2 gap-3'>
                            <form.AppField
                              name={`models[${index}].role`}
                              children={(field) => (
                                <field.SelectField label='Role' options={modelRoleOptions} />
                              )}
                            />
                            <form.AppField
                              name={`models[${index}].nodeId`}
                              children={(field) => (
                                <field.SelectField label='Service' options={modelServiceOptions} />
                              )}
                            />
                          </div>
                        </div>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          onClick={() => modelsField.removeValue(index)}
                          aria-label={`Remove model ${index + 1}`}
                        >
                          <Icons.trash className='h-4 w-4' />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              />

              <div className='grid grid-cols-[1fr_8rem] gap-4'>
                <form.AppField
                  name='modelNote'
                  children={(field) => (
                    <field.TextField label='Model note' placeholder='6000 max tokens' />
                  )}
                />
                <form.AppField
                  name='temperature'
                  children={(field) => (
                    <field.TextField label='Temperature' type='number' min={0} max={2} step={0.1} />
                  )}
                />
              </div>

              <form.AppField
                name='memory'
                children={(field) => (
                  <field.TextareaField
                    label='Memory'
                    rows={2}
                    maxLength={400}
                    placeholder='Where state and runs are stored'
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
          <LoadingButton loading={isPending} type='submit' form='agent-form-sheet'>
            {isEdit ? 'Update agent' : 'Create agent'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function AgentFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' /> Add agent
      </Button>
      <AgentFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
