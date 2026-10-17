'use client';

import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import type { KnowledgeLayer, KnowledgeSection } from '../api/types';
import { LayerEditor } from './layer-editor';
import { LayerPage } from './layer-page';
import { NewSectionDialog } from './new-section-dialog';

export type KnowledgeMode =
  | { type: 'view' }
  | { type: 'edit' }
  | { type: 'create'; sectionId?: string };

interface KnowledgeBaseViewProps {
  sections: KnowledgeSection[];
  layer: KnowledgeLayer | null;
  /** Shown as an overview when set; takes precedence over `layer`. */
  section: KnowledgeSection | null;
  mode: KnowledgeMode;
  onModeChange: (mode: KnowledgeMode) => void;
  onOpenLayer: (slug: string) => void;
  onCreateLayer: (sectionId?: string) => void;
  onDeleted: () => void;
}

export function KnowledgeBaseView({
  sections,
  layer,
  section,
  mode,
  onModeChange,
  onOpenLayer,
  onCreateLayer,
  onDeleted
}: KnowledgeBaseViewProps) {
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const layerSection = sections.find((s) => s.id === layer?.sectionId);

  return (
    <div key={section?.id ?? layer?.id} className='h-full overflow-y-auto'>
      {mode.type === 'create' ? (
        <LayerEditor
          key='create'
          sections={sections}
          defaultSectionId={mode.sectionId}
          onCancel={() => onModeChange({ type: 'view' })}
          onSaved={(saved) => onOpenLayer(saved.slug)}
        />
      ) : section ? (
        <SectionOverview
          section={section}
          onOpenLayer={onOpenLayer}
          onCreateLayer={() => onCreateLayer(section.id)}
        />
      ) : layer && mode.type === 'edit' ? (
        <LayerEditor
          key={layer.id}
          sections={sections}
          layer={layer}
          onCancel={() => onModeChange({ type: 'view' })}
          onSaved={() => onModeChange({ type: 'view' })}
        />
      ) : layer ? (
        <LayerPage
          key={layer.id}
          layer={layer}
          sectionTitle={layerSection?.title ?? ''}
          onEdit={() => onModeChange({ type: 'edit' })}
          onDeleted={onDeleted}
          onLayerLink={onOpenLayer}
        />
      ) : (
        <EmptyState
          hasSections={sections.length > 0}
          onCreateLayer={() => onCreateLayer()}
          onCreateSection={() => setSectionDialogOpen(true)}
        />
      )}
      <NewSectionDialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen} />
    </div>
  );
}

interface SectionOverviewProps {
  section: KnowledgeSection;
  onOpenLayer: (slug: string) => void;
  onCreateLayer: () => void;
}

function SectionOverview({ section, onOpenLayer, onCreateLayer }: SectionOverviewProps) {
  const count = section.layers.length;

  return (
    <div className='mx-auto w-full max-w-4xl px-6 py-8 md:px-10'>
      <header className='mb-6 flex flex-wrap items-end justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
            Section
          </p>
          <h1 className='text-3xl font-semibold tracking-tight'>{section.title}</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            {count === 0 ? 'No layers yet' : `${count} ${count === 1 ? 'layer' : 'layers'}`}
          </p>
        </div>
        <Button variant='outline' size='sm' onClick={onCreateLayer}>
          <Icons.add className='size-4' /> New layer
        </Button>
      </header>

      {count === 0 ? (
        <div className='text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm'>
          This section is empty. Add its first layer to get started.
        </div>
      ) : (
        <ul className='grid gap-3 sm:grid-cols-2'>
          {section.layers.map((layer) => (
            <li key={layer.id}>
              <button
                type='button'
                onClick={() => onOpenLayer(layer.slug)}
                className='bg-card hover:border-primary/50 hover:bg-primary/5 flex h-full w-full flex-col gap-2 rounded-lg border p-4 text-left transition-colors'
              >
                <span className='flex items-start gap-2 leading-snug font-medium'>
                  <Icons.fileText className='text-muted-foreground mt-0.5 size-4 shrink-0' />
                  <span className='line-clamp-2'>{layer.title}</span>
                </span>
                <span className='text-muted-foreground line-clamp-3 flex-1 text-sm'>
                  {layer.summary || 'No summary yet.'}
                </span>
                <span className='text-muted-foreground text-xs'>
                  Updated {formatDistanceToNow(new Date(layer.updatedAt), { addSuffix: true })}
                  {layer.updatedByName ? ` by ${layer.updatedByName}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface EmptyStateProps {
  hasSections: boolean;
  onCreateLayer: () => void;
  onCreateSection: () => void;
}

function EmptyState({ hasSections, onCreateLayer, onCreateSection }: EmptyStateProps) {
  return (
    <div className='flex h-full flex-col items-center justify-center gap-3 p-6 text-center'>
      <Icons.book className='text-muted-foreground size-10' />
      <div>
        <p className='font-medium'>The knowledge base is empty</p>
        <p className='text-muted-foreground text-sm'>
          {hasSections ? 'Create the first layer to get started.' : 'Start by adding a section.'}
        </p>
      </div>
      <Button onClick={hasSections ? onCreateLayer : onCreateSection}>
        <Icons.add className='size-4' /> {hasSections ? 'New layer' : 'New section'}
      </Button>
    </div>
  );
}
