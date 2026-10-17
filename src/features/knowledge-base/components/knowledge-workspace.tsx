'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { parseAsString, useQueryStates } from 'nuqs';
import { Suspense, useMemo, useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StarmapView, type StarFocus } from '@/features/starmap/components/starmap-view';
import { cn } from '@/lib/utils';
import { knowledgeBaseQueryOptions } from '../api/queries';
import { KnowledgeBaseView, type KnowledgeMode } from './knowledge-base-view';
import { KnowledgeLayersPanel } from './knowledge-layers-panel';

const VIEWPORT_HEIGHT = 'h-[calc(100svh-4rem)] md:h-[calc(100svh-3.5rem)]';

const selectionParsers = { layer: parseAsString, section: parseAsString };

export type KnowledgeTab = 'graph' | 'base';

interface KnowledgeWorkspaceProps {
  tab: KnowledgeTab;
  onTabChange: (tab: KnowledgeTab) => void;
}

/** Layers panel shared by both tabs, next to the graph or the knowledge base content. */
export function KnowledgeWorkspace({ tab, onTabChange }: KnowledgeWorkspaceProps) {
  const { data } = useSuspenseQuery(knowledgeBaseQueryOptions());
  const [selection, setSelection] = useQueryStates(selectionParsers);
  const [mode, setMode] = useState<KnowledgeMode>({ type: 'view' });
  const [panelOpen, setPanelOpen] = useState(false);

  const allLayers = data.sections.flatMap((section) => section.layers);
  const selectedLayer = allLayers.find((layer) => layer.slug === selection.layer) ?? null;
  const selectedSection = selectedLayer
    ? null
    : (data.sections.find((section) => section.id === selection.section) ?? null);
  const baseLayer = selectedSection ? null : (selectedLayer ?? allLayers[0] ?? null);
  const shownLayer = tab === 'graph' ? selectedLayer : mode.type === 'create' ? null : baseLayer;

  const focus = useMemo<StarFocus | null>(() => {
    if (selectedLayer) {
      return {
        label: selectedLayer.title,
        query: { primary: selectedLayer.title, secondary: selectedLayer.summary ?? '' }
      };
    }
    if (selectedSection) {
      return {
        label: selectedSection.title,
        query: {
          primary: selectedSection.title,
          secondary: selectedSection.layers.map((layer) => layer.title).join(' ')
        }
      };
    }
    return null;
  }, [selectedLayer, selectedSection]);

  function openLayer(slug: string) {
    setMode({ type: 'view' });
    setPanelOpen(false);
    void setSelection({ layer: slug, section: null });
  }

  function openSection(sectionId: string) {
    setMode({ type: 'view' });
    setPanelOpen(false);
    void setSelection({ layer: null, section: sectionId });
  }

  function clearSelection() {
    void setSelection({ layer: null, section: null });
  }

  function createLayer(sectionId?: string) {
    setPanelOpen(false);
    setMode({ type: 'create', sectionId });
    if (tab !== 'base') onTabChange('base');
  }

  return (
    <div className={cn('relative flex w-full min-w-0 overflow-hidden', VIEWPORT_HEIGHT)}>
      <KnowledgeLayersPanel
        sections={data.sections}
        activeLayerId={shownLayer?.id ?? null}
        activeSectionId={mode.type === 'create' ? null : (selectedSection?.id ?? null)}
        onSelectLayer={(layer) => openLayer(layer.slug)}
        onSelectSection={(section) => openSection(section.id)}
        onCreateLayer={createLayer}
        open={panelOpen}
        onOpenChange={setPanelOpen}
      />

      <main className='flex min-w-0 flex-1 flex-col'>
        <div className='flex shrink-0 items-center gap-2 border-b px-3 py-2 md:hidden'>
          <Button size='sm' variant='ghost' onClick={() => setPanelOpen(true)}>
            <Icons.panelLeft className='size-4' /> Layers
          </Button>
          <span className='text-muted-foreground truncate text-sm'>
            {selectedSection?.title ?? shownLayer?.title}
          </span>
        </div>
        <div className='min-h-0 flex-1'>
          {tab === 'graph' ? (
            <Suspense fallback={<Skeleton className='size-full rounded-none' />}>
              <StarmapView focus={focus} onClearFocus={clearSelection} />
            </Suspense>
          ) : (
            <KnowledgeBaseView
              sections={data.sections}
              layer={baseLayer}
              section={selectedSection}
              mode={mode}
              onModeChange={setMode}
              onOpenLayer={openLayer}
              onCreateLayer={createLayer}
              onDeleted={clearSelection}
            />
          )}
        </div>
      </main>
    </div>
  );
}
