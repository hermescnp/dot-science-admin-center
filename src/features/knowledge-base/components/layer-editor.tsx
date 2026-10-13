'use client';

import { useStore } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { useAppForm } from '@/lib/form';
import { cn } from '@/lib/utils';
import { knowledgeBaseKeys } from '../api/queries';
import { createLayer, updateLayer } from '../api/service';
import { layerFormSchema, type KnowledgeLayer, type KnowledgeSection } from '../api/types';
import { LayerContentEditor } from './layer-content-editor';
import { Markdown } from './markdown';

interface LayerEditorProps {
  sections: KnowledgeSection[];
  layer?: KnowledgeLayer;
  defaultSectionId?: string;
  onCancel: () => void;
  onSaved: (layer: KnowledgeLayer) => void;
}

export function LayerEditor({
  sections,
  layer,
  defaultSectionId,
  onCancel,
  onSaved
}: LayerEditorProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'write' | 'preview'>('write');

  const defaultValues = {
    title: layer?.title ?? '',
    sectionId: layer?.sectionId ?? defaultSectionId ?? sections[0]?.id ?? '',
    summary: layer?.summary ?? '',
    content: layer?.content ?? ''
  };

  const mutation = useMutation({
    mutationFn: (values: typeof defaultValues) => {
      const payload = { ...values, summary: values.summary.trim() || null };
      return layer ? updateLayer(layer.id, payload) : createLayer(payload);
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      toast.success(layer ? 'Layer updated' : 'Layer created');
      onSaved(saved);
    },
    onError: () => toast.error(layer ? "Couldn't update the layer" : "Couldn't create the layer")
  });

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: layerFormSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value).catch(() => undefined);
    }
  });

  const content = useStore(form.store, (state) => state.values.content);
  const isDefault = useStore(form.store, (state) => state.isDefaultValue);

  return (
    <form
      className='@container/editor flex h-full min-h-0 flex-col'
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div className='flex shrink-0 items-center justify-between gap-3 border-b px-6 py-3'>
        <div className='min-w-0'>
          <p className='text-muted-foreground text-xs tracking-wider uppercase'>
            {layer ? 'Editing layer' : 'New layer'}
          </p>
          <p className='truncate font-medium'>{layer?.title ?? 'Untitled layer'}</p>
        </div>
        <div className='flex shrink-0 gap-2'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <form.AppForm>
            <form.SubmitButton disabled={layer ? isDefault : false}>
              {layer ? 'Save changes' : 'Create layer'}
            </form.SubmitButton>
          </form.AppForm>
        </div>
      </div>

      <div className='flex shrink-0 gap-1 border-b px-6 py-2 @4xl/editor:hidden'>
        {(['write', 'preview'] as const).map((pane) => (
          <Button
            key={pane}
            type='button'
            size='sm'
            variant={view === pane ? 'secondary' : 'ghost'}
            onClick={() => setView(pane)}
          >
            {pane === 'write' ? 'Write' : 'Preview'}
          </Button>
        ))}
      </div>

      <div className='grid min-h-0 flex-1 @4xl/editor:grid-cols-2'>
        <div
          className={cn(
            'min-h-0 flex-col gap-4 overflow-y-auto p-6 @4xl/editor:flex @4xl/editor:border-r',
            view === 'write' ? 'flex' : 'hidden'
          )}
        >
          <div className='grid gap-4 sm:grid-cols-2'>
            <form.AppField
              name='title'
              children={(field) => <field.TextField label='Title' required maxLength={120} />}
            />
            <form.AppField
              name='sectionId'
              children={(field) => (
                <field.SelectField
                  label='Section'
                  required
                  options={sections.map((section) => ({
                    value: section.id,
                    label: section.title
                  }))}
                />
              )}
            />
          </div>
          <form.AppField
            name='summary'
            children={(field) => (
              <field.TextField
                label='Summary'
                placeholder='One sentence shown under the title'
                maxLength={300}
              />
            )}
          />
          <form.Field
            name='content'
            children={(field) => {
              const isInvalid = field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={isInvalid} className='flex-1'>
                  <FieldLabel>Content</FieldLabel>
                  <LayerContentEditor
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                  />
                  {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                </Field>
              );
            }}
          />
        </div>

        <div
          className={cn(
            'min-h-0 flex-col @4xl/editor:flex',
            view === 'preview' ? 'flex' : 'hidden'
          )}
        >
          <p className='text-muted-foreground hidden shrink-0 border-b px-6 py-2 text-xs tracking-wider uppercase @4xl/editor:block'>
            Preview
          </p>
          <div className='min-h-0 flex-1 overflow-y-auto px-8 py-6'>
            {content.trim() ? (
              <Markdown content={content} />
            ) : (
              <p className='text-muted-foreground text-sm'>Nothing to preview yet.</p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
