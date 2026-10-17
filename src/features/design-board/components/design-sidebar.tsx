'use client';

import { useMutation } from '@tanstack/react-query';
import { useDeferredValue, useState } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import { SectionRow } from '@/components/section-row';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  createLayer,
  createSection,
  deleteLayer,
  deleteSection,
  renameSection,
  updateLayer
} from '../api/service';
import type { DesignLayer, DesignSection } from '../api/types';
import { updateLayerCache, updateSectionCache, updateSectionsCache } from '../lib/design-cache';
import { TitleDialog } from './title-dialog';

type DialogState =
  | { kind: 'new-section' }
  | { kind: 'new-layer'; sectionId: string }
  | { kind: 'rename-section'; section: DesignSection }
  | { kind: 'rename-layer'; layer: DesignLayer };

type DeleteTarget =
  | { kind: 'section'; section: DesignSection }
  | { kind: 'layer'; layer: DesignLayer };

interface DesignSidebarProps {
  sections: DesignSection[];
  activeLayer: DesignLayer | null;
  /** Set when the whole section is selected rather than one of its layers. */
  activeSectionId: string | null;
  onSelect: (layerId: string | null) => void;
  onSelectSection: (sectionId: string) => void;
  open: boolean;
  /** Receives the element under the active layer row where its screen structure is rendered. */
  onStructureSlot?: (element: HTMLElement | null) => void;
}

export function DesignSidebar({
  sections,
  activeLayer,
  activeSectionId,
  onSelect,
  onSelectSection,
  open,
  onStructureSlot
}: DesignSidebarProps) {
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const currentSectionId = activeSectionId ?? activeLayer?.sectionId ?? null;
  const [openSectionIds, setOpenSectionIds] = useState<ReadonlySet<string>>(
    () => new Set(currentSectionId ? [currentSectionId] : sections.slice(0, 1).map((s) => s.id))
  );

  const query = useDeferredValue(search.trim().toLowerCase());
  const visibleSections = query
    ? sections
        .map((section) =>
          section.title.toLowerCase().includes(query)
            ? section
            : {
                ...section,
                layers: section.layers.filter((layer) => layer.title.toLowerCase().includes(query))
              }
        )
        .filter(
          (section) => section.layers.length > 0 || section.title.toLowerCase().includes(query)
        )
    : sections;

  function setSectionOpen(id: string, isOpen: boolean) {
    setOpenSectionIds((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function select(layer: DesignLayer) {
    setSectionOpen(layer.sectionId, true);
    onSelect(layer.id);
  }

  function selectSection(section: DesignSection) {
    setSectionOpen(section.id, true);
    onSelectSection(section.id);
  }

  const deleteMutation = useMutation({
    mutationFn: (target: DeleteTarget) =>
      target.kind === 'section' ? deleteSection(target.section.id) : deleteLayer(target.layer.id),
    onSuccess: (_result, target) => {
      if (target.kind === 'section') {
        updateSectionsCache((list) => list.filter((section) => section.id !== target.section.id));
        if (currentSectionId === target.section.id) onSelect(null);
      } else {
        updateSectionCache(target.layer.sectionId, (section) => ({
          ...section,
          layers: section.layers.filter((layer) => layer.id !== target.layer.id)
        }));
        if (activeLayer?.id === target.layer.id) onSelect(null);
      }
      toast.success(`${target.kind === 'section' ? 'Section' : 'Layer'} deleted`);
      setDeleting(null);
    },
    onError: () => toast.error("Couldn't delete it")
  });

  async function submitDialog(state: DialogState, title: string) {
    try {
      switch (state.kind) {
        case 'new-section': {
          const section = await createSection({ title });
          updateSectionsCache((list) => [...list, section]);
          if (section.layers[0]) select(section.layers[0]);
          toast.success('Section created');
          return;
        }
        case 'new-layer': {
          const layer = await createLayer({ sectionId: state.sectionId, title });
          updateSectionCache(state.sectionId, (section) => ({
            ...section,
            layers: [...section.layers, layer]
          }));
          select(layer);
          toast.success('Layer created');
          return;
        }
        case 'rename-section':
          await renameSection(state.section.id, { title });
          updateSectionCache(state.section.id, (section) => ({ ...section, title }));
          return;
        case 'rename-layer':
          await updateLayer(state.layer.id, { title });
          updateLayerCache(state.layer.id, (layer) => ({ ...layer, title }));
          return;
      }
    } catch (error) {
      toast.error("Couldn't save it");
      throw error;
    }
  }

  return (
    <aside
      className={cn(
        'bg-background absolute inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col border-r transition-transform md:static md:translate-x-0',
        open ? 'translate-x-0 shadow-xl' : '-translate-x-full'
      )}
    >
      <div className='bg-background relative shrink-0 border-b'>
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
              disabled={sections.length === 0}
              onClick={() =>
                setDialog({
                  kind: 'new-layer',
                  sectionId: currentSectionId ?? sections[0]!.id
                })
              }
            >
              <Icons.layers className='mr-2 size-4' /> New layer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialog({ kind: 'new-section' })}>
              <Icons.workspace className='mr-2 size-4' /> New section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav aria-label='Design sections and layers' className='flex-1 overflow-y-auto p-2'>
        {visibleSections.length === 0 ? (
          <p className='text-muted-foreground px-2 py-6 text-center text-sm'>
            {query ? 'No layers match your search.' : 'No sections yet.'}
          </p>
        ) : (
          visibleSections.map((section) => (
            <SectionGroup
              key={section.id}
              section={section}
              open={Boolean(query) || openSectionIds.has(section.id)}
              onOpenChange={(isOpen) => setSectionOpen(section.id, isOpen)}
              selected={activeSectionId === section.id}
              onSelectSection={() => selectSection(section)}
              activeId={activeLayer?.id ?? null}
              onSelect={select}
              onAddLayer={() => setDialog({ kind: 'new-layer', sectionId: section.id })}
              onRenameSection={() => setDialog({ kind: 'rename-section', section })}
              onDeleteSection={() => setDeleting({ kind: 'section', section })}
              onRenameLayer={(layer) => setDialog({ kind: 'rename-layer', layer })}
              onDeleteLayer={(layer) => setDeleting({ kind: 'layer', layer })}
              onStructureSlot={onStructureSlot}
            />
          ))
        )}
      </nav>

      {dialog ? (
        <TitleDialog
          key={dialogKey(dialog)}
          open
          onOpenChange={(isOpen) => !isOpen && setDialog(null)}
          {...dialogCopy(dialog)}
          onSubmit={(title) => submitDialog(dialog, title)}
        />
      ) : null}

      <AlertModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        loading={deleteMutation.isPending}
        title={
          deleting?.kind === 'section'
            ? `Delete “${deleting.section.title}”?`
            : `Delete “${deleting?.layer.title ?? ''}”?`
        }
        description={
          deleting?.kind === 'section'
            ? 'The section and every layer on its canvas, including drawings and screens, will be deleted.'
            : 'The layer’s drawings and screen will be deleted.'
        }
        confirmLabel='Delete'
      />
    </aside>
  );
}

function dialogKey(dialog: DialogState) {
  switch (dialog.kind) {
    case 'new-section':
      return 'new-section';
    case 'new-layer':
      return `new-layer:${dialog.sectionId}`;
    case 'rename-section':
      return `rename-section:${dialog.section.id}`;
    case 'rename-layer':
      return `rename-layer:${dialog.layer.id}`;
  }
}

function dialogCopy(dialog: DialogState) {
  switch (dialog.kind) {
    case 'new-section':
      return {
        title: 'New section',
        description: 'A section is a canvas. It starts with one layer you can draw on.',
        submitLabel: 'Create section',
        maxLength: 80
      };
    case 'new-layer':
      return {
        title: 'New layer',
        description: 'A layer groups drawings and can hold one interface screen.',
        submitLabel: 'Create layer',
        maxLength: 120
      };
    case 'rename-section':
      return {
        title: 'Rename section',
        description: 'Shown in the left panel.',
        submitLabel: 'Save',
        initialValue: dialog.section.title,
        maxLength: 80
      };
    case 'rename-layer':
      return {
        title: 'Rename layer',
        description: 'Also used as the screen title in Layout Design.',
        submitLabel: 'Save',
        initialValue: dialog.layer.title,
        maxLength: 120
      };
  }
}

interface SectionGroupProps {
  section: DesignSection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: boolean;
  onSelectSection: () => void;
  activeId: string | null;
  onSelect: (layer: DesignLayer) => void;
  onAddLayer: () => void;
  onRenameSection: () => void;
  onDeleteSection: () => void;
  onRenameLayer: (layer: DesignLayer) => void;
  onDeleteLayer: (layer: DesignLayer) => void;
  onStructureSlot?: (element: HTMLElement | null) => void;
}

function SectionGroup({
  section,
  open,
  onOpenChange,
  selected,
  onSelectSection,
  activeId,
  onSelect,
  onAddLayer,
  onRenameSection,
  onDeleteSection,
  onRenameLayer,
  onDeleteLayer,
  onStructureSlot
}: SectionGroupProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className='mb-1'>
      <SectionRow
        title={section.title}
        count={section.layers.length}
        open={open}
        selected={selected}
        onSelect={onSelectSection}
      >
        <RowMenu label={`${section.title} actions`}>
          <DropdownMenuItem onClick={onAddLayer}>
            <Icons.add className='mr-2 size-4' /> New layer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRenameSection}>
            <Icons.edit className='mr-2 size-4' /> Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant='destructive' onClick={onDeleteSection}>
            <Icons.trash className='mr-2 size-4' /> Delete section
          </DropdownMenuItem>
        </RowMenu>
      </SectionRow>
      <CollapsibleContent className='h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none'>
        <ul className='mt-0.5 mb-2 ml-3.5 border-l'>
          {section.layers.length === 0 ? (
            <li className='text-muted-foreground px-3 py-1.5 text-xs italic'>No layers yet</li>
          ) : (
            section.layers.map((layer) => {
              const LayerIcon = layer.screen
                ? layer.screen.device === 'desktop'
                  ? Icons.deviceDesktop
                  : Icons.deviceMobile
                : Icons.layers;
              const active = layer.id === activeId;
              return (
                <li key={layer.id}>
                  <div
                    className={cn(
                      'group/layer -ml-px flex items-center border-l pr-1 transition-colors',
                      active
                        ? 'border-primary text-foreground bg-primary/10 font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent'
                    )}
                  >
                    <button
                      type='button'
                      onClick={() => onSelect(layer)}
                      aria-current={active ? 'page' : undefined}
                      className='flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 pl-3 text-left text-sm'
                    >
                      <LayerIcon className='size-3.5 shrink-0 opacity-60' />
                      <span className='truncate'>{layer.title}</span>
                    </button>
                    <RowMenu label={`${layer.title} actions`}>
                      <DropdownMenuItem onClick={() => onRenameLayer(layer)}>
                        <Icons.edit className='mr-2 size-4' /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant='destructive' onClick={() => onDeleteLayer(layer)}>
                        <Icons.trash className='mr-2 size-4' /> Delete layer
                      </DropdownMenuItem>
                    </RowMenu>
                  </div>
                  {active && onStructureSlot ? (
                    <div
                      ref={onStructureSlot}
                      className='my-0.5 ml-4.5 border-l pl-1.5 empty:hidden'
                    />
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function RowMenu({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='ghost'
            size='icon'
            className='size-6 shrink-0 opacity-0 group-hover/layer:opacity-100 group-hover/section:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100'
          />
        }
      >
        <Icons.dots className='size-3.5' />
        <span className='sr-only'>{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-44'>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
