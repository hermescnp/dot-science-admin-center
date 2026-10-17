import { getQueryClient } from '@/lib/query-client';
import { designKeys } from '../api/queries';
import type { DesignLayer, DesignSection } from '../api/types';

export function updateSectionsCache(update: (sections: DesignSection[]) => DesignSection[]) {
  getQueryClient().setQueryData<DesignSection[]>(designKeys.sections(), (prev) =>
    prev ? update(prev) : prev
  );
}

export function updateSectionCache(id: string, update: (section: DesignSection) => DesignSection) {
  updateSectionsCache((sections) =>
    sections.map((section) => (section.id === id ? update(section) : section))
  );
}

export function updateLayerCache(id: string, update: (layer: DesignLayer) => DesignLayer) {
  updateSectionsCache((sections) =>
    sections.map((section) =>
      section.layers.some((layer) => layer.id === id)
        ? {
            ...section,
            layers: section.layers.map((layer) => (layer.id === id ? update(layer) : layer))
          }
        : section
    )
  );
}
