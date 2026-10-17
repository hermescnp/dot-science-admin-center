'use client';

import { stripBlockIdComments } from '@hermescnp/content-blocks';
import { useDeferredValue, useState } from 'react';
import { Icons } from '@/components/icons';
import { SectionRow } from '@/components/section-row';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { KnowledgeLayer, KnowledgeSection } from '../api/types';
import { NewSectionDialog } from './new-section-dialog';

function matches(layer: KnowledgeLayer, query: string) {
  return [layer.title, layer.summary ?? '', stripBlockIdComments(layer.content)].some((value) =>
    value.toLowerCase().includes(query)
  );
}

interface KnowledgeLayersPanelProps {
  sections: KnowledgeSection[];
  activeLayerId: string | null;
  /** Set when the whole section is selected rather than one of its layers. */
  activeSectionId: string | null;
  onSelectLayer: (layer: KnowledgeLayer) => void;
  onSelectSection: (section: KnowledgeSection) => void;
  onCreateLayer: (sectionId?: string) => void;
  /** Drawer state below `md`; the panel is always visible from `md` up. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Searchable sections and layers of the knowledge base, shared by the base and graph tabs. */
export function KnowledgeLayersPanel({
  sections,
  activeLayerId,
  activeSectionId,
  onSelectLayer,
  onSelectSection,
  onCreateLayer,
  open,
  onOpenChange
}: KnowledgeLayersPanelProps) {
  const [search, setSearch] = useState('');
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const currentSectionId =
    activeSectionId ??
    sections.find((section) => section.layers.some((layer) => layer.id === activeLayerId))?.id ??
    null;
  const [openSectionIds, setOpenSectionIds] = useState<ReadonlySet<string>>(
    () => new Set(currentSectionId ? [currentSectionId] : [])
  );

  const query = useDeferredValue(search.trim().toLowerCase());
  const visibleSections = query
    ? sections
        .map((section) =>
          section.title.toLowerCase().includes(query)
            ? section
            : { ...section, layers: section.layers.filter((layer) => matches(layer, query)) }
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

  return (
    <>
      <aside
        className={cn(
          'bg-background absolute inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col border-r transition-transform md:static md:translate-x-0',
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
                onClick={() => onCreateLayer(currentSectionId ?? undefined)}
              >
                <Icons.fileText className='mr-2 size-4' /> New layer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSectionDialogOpen(true)}>
                <Icons.workspace className='mr-2 size-4' /> New section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav aria-label='Knowledge layers' className='flex-1 overflow-y-auto p-2'>
          {visibleSections.length === 0 ? (
            <p className='text-muted-foreground px-2 py-6 text-center text-sm'>
              {query ? 'No layers match your search.' : 'No sections yet.'}
            </p>
          ) : (
            visibleSections.map((section) => {
              const isOpen = Boolean(query) || openSectionIds.has(section.id);
              return (
                <Collapsible
                  key={section.id}
                  open={isOpen}
                  onOpenChange={(next) => setSectionOpen(section.id, next)}
                  className='mb-1'
                >
                  <SectionRow
                    title={section.title}
                    count={section.layers.length}
                    open={isOpen}
                    selected={activeSectionId === section.id}
                    onSelect={() => {
                      setSectionOpen(section.id, true);
                      onSelectSection(section);
                    }}
                  />
                  <CollapsibleContent className='h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none'>
                    <ul className='mt-0.5 mb-2 ml-3.5 border-l'>
                      {section.layers.length === 0 ? (
                        <li className='text-muted-foreground px-3 py-1.5 text-xs italic'>
                          No layers yet
                        </li>
                      ) : (
                        section.layers.map((layer) => (
                          <li key={layer.id}>
                            <button
                              type='button'
                              onClick={() => {
                                setSectionOpen(section.id, true);
                                onSelectLayer(layer);
                              }}
                              aria-current={layer.id === activeLayerId ? 'page' : undefined}
                              className={cn(
                                '-ml-px flex w-full items-center gap-2 border-l py-1.5 pr-2 pl-3 text-left text-sm transition-colors',
                                layer.id === activeLayerId
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
            })
          )}
        </nav>
      </aside>

      {open ? (
        <button
          type='button'
          aria-label='Close layers panel'
          className='absolute inset-0 z-20 bg-black/40 md:hidden'
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <NewSectionDialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen} />
    </>
  );
}
