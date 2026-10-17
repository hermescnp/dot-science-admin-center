'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { parseAsString, useQueryStates } from 'nuqs';
import { useMemo, useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { designSectionsQueryOptions } from '../api/queries';
import { resolveSection } from '../lib/components';
import { ComponentsByIdContext, useDesignComponents } from '../lib/use-components';
import { commitPendingCanvas } from '../store/camera-store';
import { DesignSidebar } from './design-sidebar';
import { FreeDesignCanvas } from './free-design-canvas';
import { InterfaceDesign } from './interface/interface-design';

const selectionParsers = { layer: parseAsString, section: parseAsString };

export function DesignView() {
  const { data: sections } = useSuspenseQuery(designSectionsQueryOptions());
  const [selection, setSelection] = useQueryStates(selectionParsers);
  const [panelOpen, setPanelOpen] = useState(false);
  const [structureSlot, setStructureSlot] = useState<HTMLElement | null>(null);
  /** The layer whose screen is open in the layout editor; every other screen stays a sketch. */
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  /** Element to select when the layout editor opens. */
  const [editSelectionId, setEditSelectionId] = useState<string | null>(null);

  const allLayers = sections.flatMap((section) => section.layers);
  const selectedLayer = allLayers.find((layer) => layer.id === selection.layer) ?? null;
  const selectedSection = selectedLayer
    ? null
    : (sections.find((section) => section.id === selection.section) ?? null);
  const activeLayer = selectedSection ? null : (selectedLayer ?? allLayers[0] ?? null);
  const activeSection =
    selectedSection ?? sections.find((section) => section.id === activeLayer?.sectionId) ?? null;

  // Any change of layer leaves the layout editor.
  const [shownLayerId, setShownLayerId] = useState(activeLayer?.id ?? null);
  if (shownLayerId !== (activeLayer?.id ?? null)) {
    setShownLayerId(activeLayer?.id ?? null);
    setEditingLayerId(null);
  }
  const editing = Boolean(activeLayer?.screen) && editingLayerId === activeLayer?.id;

  const { byId: componentsById } = useDesignComponents();
  const resolvedSection = useMemo(
    () => (activeSection ? resolveSection(activeSection, componentsById) : null),
    [activeSection, componentsById]
  );
  const resolvedLayer =
    resolvedSection?.layers.find((layer) => layer.id === activeLayer?.id) ?? activeLayer;

  function toggleEditing() {
    commitPendingCanvas();
    setEditSelectionId(null);
    setEditingLayerId(editing ? null : (activeLayer?.id ?? null));
  }

  function editComponent(instanceId: string) {
    commitPendingCanvas();
    setEditSelectionId(instanceId);
    setEditingLayerId(activeLayer?.id ?? null);
  }

  function selectLayer(id: string | null) {
    setPanelOpen(false);
    void setSelection({ layer: id, section: null });
  }

  function selectSection(id: string) {
    setPanelOpen(false);
    void setSelection({ layer: null, section: id });
  }

  return (
    <ComponentsByIdContext value={componentsById}>
      <div className='relative flex h-[calc(100svh-4rem)] w-full min-w-0 overflow-hidden md:h-[calc(100svh-3.5rem)]'>
        <DesignSidebar
          sections={sections}
          activeLayer={activeLayer}
          activeSectionId={selectedSection?.id ?? null}
          onSelect={selectLayer}
          onSelectSection={selectSection}
          open={panelOpen}
          onStructureSlot={editing ? setStructureSlot : undefined}
        />

        <main className='relative min-w-0 flex-1'>
          {resolvedSection && resolvedSection.layers.length > 0 ? (
            editing && resolvedLayer ? (
              <InterfaceDesign
                key={resolvedSection.id}
                section={resolvedSection}
                activeLayer={resolvedLayer}
                onSelectLayer={selectLayer}
                onDone={toggleEditing}
                initialSelectedId={editSelectionId}
                structureSlot={structureSlot}
              />
            ) : (
              <FreeDesignCanvas
                key={resolvedSection.id}
                section={resolvedSection}
                activeLayerId={activeLayer?.id ?? null}
                onSelectLayer={selectLayer}
                onEditLayout={toggleEditing}
                onEditComponent={editComponent}
              />
            )
          ) : (
            <div className='flex h-full flex-col items-center justify-center gap-3 p-6 text-center'>
              <Icons.whiteboard className='text-muted-foreground size-10' />
              <div>
                <p className='font-medium'>
                  {activeSection ? `${activeSection.title} has no layers` : 'No canvas yet'}
                </p>
                <p className='text-muted-foreground text-sm'>
                  {activeSection
                    ? 'Add a layer from the section menu in the left panel to start drawing.'
                    : 'Use the + button in the left panel to add a section or a layer.'}
                </p>
              </div>
            </div>
          )}

          <Button
            size='sm'
            variant='secondary'
            className='absolute bottom-4 left-4 z-20 shadow md:hidden'
            onClick={() => setPanelOpen(true)}
          >
            <Icons.panelLeft className='size-4' /> Layers
          </Button>
        </main>

        {panelOpen ? (
          <button
            type='button'
            aria-label='Close layers panel'
            className='absolute inset-0 z-20 bg-black/40 md:hidden'
            onClick={() => setPanelOpen(false)}
          />
        ) : null}
      </div>
    </ComponentsByIdContext>
  );
}
