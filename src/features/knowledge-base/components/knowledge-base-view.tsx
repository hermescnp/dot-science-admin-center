'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { parseAsString, useQueryState } from 'nuqs';
import { useDeferredValue, useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { knowledgeBaseQueryOptions } from '../api/queries';
import type { KnowledgeLayer, KnowledgeSection } from '../api/types';
import { LayerEditor } from './layer-editor';
import { LayerPage } from './layer-page';
import { NewSectionDialog } from './new-section-dialog';

type Mode = { type: 'view' } | { type: 'edit' } | { type: 'create'; sectionId?: string };

function matches(layer: KnowledgeLayer, query: string) {
  return [layer.title, layer.summary ?? '', layer.content].some((value) =>
    value.toLowerCase().includes(query)
  );
}

export function KnowledgeBaseView() {
  const { data } = useSuspenseQuery(knowledgeBaseQueryOptions());
  const [slug, setSlug] = useQueryState('layer', parseAsString);
  const [mode, setMode] = useState<Mode>({ type: 'view' });
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const query = useDeferredValue(search.trim().toLowerCase());
  const allLayers = data.sections.flatMap((section) => section.layers);
  const active = allLayers.find((layer) => layer.slug === slug) ?? allLayers[0] ?? null;
  const activeSection = data.sections.find((section) => section.id === active?.sectionId);

  const visibleSections = query
    ? data.sections
        .map((section) => ({
          ...section,
          layers: section.layers.filter((layer) => matches(layer, query))
        }))
        .filter((section) => section.layers.length > 0)
    : data.sections;

  function openLayer(nextSlug: string) {
    setMode({ type: 'view' });
    setPanelOpen(false);
    void setSlug(nextSlug);
  }

  function toggleSection(id: string, open: boolean) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (open) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className='relative flex h-[calc(100svh-4rem)] w-full min-w-0 md:h-[calc(100svh-3.5rem)]'>
      <aside
        className={cn(
          'bg-background absolute inset-y-0 left-0 z-20 flex w-72 shrink-0 flex-col border-r transition-transform md:static md:translate-x-0',
          panelOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        )}
      >
        <div className='relative shrink-0 border-b'>
          <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search layers…'
            aria-label='Search layers'
            className='h-11 rounded-none border-0 bg-transparent pr-11 pl-9 shadow-none focus-visible:ring-0 dark:bg-transparent'
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon'
                  className='absolute top-1/2 right-2 size-7 -translate-y-1/2'
                />
              }
            >
              <Icons.add className='size-4' />
              <span className='sr-only'>Add</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              <DropdownMenuItem
                disabled={data.sections.length === 0}
                onClick={() => {
                  setPanelOpen(false);
                  setMode({ type: 'create', sectionId: active?.sectionId });
                }}
              >
                <Icons.fileText className='mr-2 size-4' /> New layer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSectionDialogOpen(true)}>
                <Icons.workspace className='mr-2 size-4' /> New section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav aria-label='Knowledge layers' className='min-h-0 flex-1 overflow-y-auto p-2'>
          {visibleSections.length === 0 ? (
            <p className='text-muted-foreground px-2 py-6 text-center text-sm'>
              {query ? 'No layers match your search.' : 'No sections yet.'}
            </p>
          ) : (
            visibleSections.map((section) => (
              <SectionGroup
                key={section.id}
                section={section}
                open={Boolean(query) || !collapsed.has(section.id)}
                onOpenChange={(open) => toggleSection(section.id, open)}
                activeId={mode.type === 'create' ? null : (active?.id ?? null)}
                onSelect={openLayer}
              />
            ))
          )}
        </nav>
      </aside>

      {panelOpen ? (
        <button
          type='button'
          aria-label='Close layers panel'
          className='absolute inset-0 z-10 bg-black/40 md:hidden'
          onClick={() => setPanelOpen(false)}
        />
      ) : null}

      <main className='flex min-w-0 flex-1 flex-col'>
        <div className='flex shrink-0 items-center gap-2 border-b px-3 py-2 md:hidden'>
          <Button size='sm' variant='ghost' onClick={() => setPanelOpen(true)}>
            <Icons.panelLeft className='size-4' /> Layers
          </Button>
          <span className='text-muted-foreground truncate text-sm'>{active?.title}</span>
        </div>
        <div className='min-h-0 flex-1'>
          {mode.type === 'create' ? (
            <LayerEditor
              key='create'
              sections={data.sections}
              defaultSectionId={mode.sectionId}
              onCancel={() => setMode({ type: 'view' })}
              onSaved={(layer) => openLayer(layer.slug)}
            />
          ) : active && mode.type === 'edit' ? (
            <LayerEditor
              key={active.id}
              sections={data.sections}
              layer={active}
              onCancel={() => setMode({ type: 'view' })}
              onSaved={() => setMode({ type: 'view' })}
            />
          ) : active ? (
            <LayerPage
              key={active.id}
              layer={active}
              sectionTitle={activeSection?.title ?? ''}
              onEdit={() => setMode({ type: 'edit' })}
              onDeleted={() => void setSlug(null)}
              onLayerLink={openLayer}
            />
          ) : (
            <EmptyState
              hasSections={data.sections.length > 0}
              onCreateLayer={() => setMode({ type: 'create' })}
              onCreateSection={() => setSectionDialogOpen(true)}
            />
          )}
        </div>
      </main>

      <NewSectionDialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen} />
    </div>
  );
}

interface SectionGroupProps {
  section: KnowledgeSection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeId: string | null;
  onSelect: (slug: string) => void;
}

function SectionGroup({ section, open, onOpenChange, activeId, onSelect }: SectionGroupProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className='mb-1'>
      <CollapsibleTrigger className='text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold tracking-wider uppercase'>
        <Icons.chevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
        <span className='flex-1 truncate text-left'>{section.title}</span>
        <span className='bg-muted rounded-full px-1.5 text-[10px] font-medium tabular-nums'>
          {section.layers.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className='mt-0.5 mb-2 ml-3.5 border-l'>
          {section.layers.length === 0 ? (
            <li className='text-muted-foreground px-3 py-1.5 text-xs italic'>No layers yet</li>
          ) : (
            section.layers.map((layer) => (
              <li key={layer.id}>
                <button
                  type='button'
                  onClick={() => onSelect(layer.slug)}
                  aria-current={layer.id === activeId ? 'page' : undefined}
                  className={cn(
                    '-ml-px flex w-full items-center gap-2 border-l py-1.5 pr-2 pl-3 text-left text-sm transition-colors',
                    layer.id === activeId
                      ? 'border-primary text-foreground bg-primary/10 font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent'
                  )}
                >
                  <Icons.fileText className='size-3.5 shrink-0 opacity-60' />
                  <span className='truncate'>{layer.title}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </CollapsibleContent>
    </Collapsible>
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
