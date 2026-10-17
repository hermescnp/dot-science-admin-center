import { useRef } from 'react';
import { updateLayer } from '../api/service';
import type { DesignLayer, DesignSection, InterfaceScreen } from '../api/types';
import { syncComponents } from './components';
import { updateLayerCache } from './design-cache';
import { useComponentSaves, useDesignComponents } from './use-components';
import { combineSaveStates, useDebouncedSave } from './use-debounced-save';

interface PendingScreen {
  layerId: string;
  screen: InterfaceScreen | null;
}

/**
 * Edits to the active layer's screen: applied to the cache at once, saved after a pause. Edits
 * made inside component instances are carried to the component, so every instance follows.
 */
export function useScreenSave(section: DesignSection, layer: DesignLayer | null) {
  const layerId = layer?.id ?? null;
  const screen = layer?.screen ?? null;
  const { byId } = useDesignComponents();
  const components = useComponentSaves();
  const { state, schedule, flush } = useDebouncedSave<PendingScreen>(
    ({ layerId: id, screen: next }) =>
      updateLayer(id, { screen: next }).then((saved) => saved.updatedAt),
    layer?.updatedAt ?? section.updatedAt
  );
  const pendingLayerRef = useRef<string | null>(null);

  function writeScreen(next: InterfaceScreen | null) {
    if (!layerId) return;
    if (next) components.saveComponents(syncComponents(next.nodes, byId));
    updateLayerCache(layerId, (current) => ({ ...current, screen: next }));
    if (pendingLayerRef.current && pendingLayerRef.current !== layerId) void flush();
    pendingLayerRef.current = layerId;
    schedule({ layerId, screen: next });
  }

  function editScreen(updates: Partial<InterfaceScreen>) {
    if (screen) writeScreen({ ...screen, ...updates });
  }

  async function flushAll() {
    await components.flush();
    await flush();
  }

  return {
    state: combineSaveStates(state, components.state),
    writeScreen,
    editScreen,
    flush: flushAll
  };
}
