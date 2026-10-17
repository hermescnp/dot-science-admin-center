import { useSuspenseQuery } from '@tanstack/react-query';
import { createContext, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/query-client';
import { designComponentsQueryOptions, designKeys } from '../api/queries';
import {
  createComponent,
  deleteComponent,
  refineComponentPreview,
  updateComponent,
  vibeEditComponent as requestVibeEdit
} from '../api/service';
import type { DesignComponent, UiNode } from '../api/types';
import { toComponentNode, type ComponentsById } from './components';
import { useDebouncedSave } from './use-debounced-save';

const NEVER_SAVED = new Date(0).toISOString();

/** Components whose editable tree changed during Edit layout and need a new preview. */
const dirtyPreviewIds = new Set<string>();

export const ComponentsByIdContext = createContext<ComponentsById>(new Map());

function updateComponentsCache(update: (components: DesignComponent[]) => DesignComponent[]) {
  getQueryClient().setQueryData<DesignComponent[]>(designKeys.components(), (prev) =>
    prev ? update(prev) : prev
  );
}

function replaceComponent(component: DesignComponent) {
  updateComponentsCache((components) =>
    components.map((current) => (current.id === component.id ? component : current))
  );
}

export function useDesignComponents(): {
  components: DesignComponent[];
  byId: ComponentsById;
} {
  const { data: components } = useSuspenseQuery(designComponentsQueryOptions());
  const byId = useMemo(
    () => new Map(components.map((component) => [component.id, component])),
    [components]
  );
  return { components, byId };
}

function componentName(node: UiNode): string {
  return node.label.trim().slice(0, 200) || 'Component';
}

export function markComponentsDirty(ids: Iterable<string>) {
  for (const id of ids) dirtyPreviewIds.add(id);
}

function markPending(ids: ReadonlySet<string>) {
  updateComponentsCache((components) =>
    components.map((component) =>
      ids.has(component.id)
        ? { ...component, previewStatus: 'pending', previewError: null }
        : component
    )
  );
}

/**
 * Generates (or regenerates) the interactive preview and description for one component;
 * `change` names a structure edit the new preview has to show.
 */
export async function refineComponent(id: string, change?: string): Promise<DesignComponent> {
  markPending(new Set([id]));
  try {
    const saved = await refineComponentPreview(id, { change });
    replaceComponent(saved);
    return saved;
  } catch (error) {
    updateComponentsCache((components) =>
      components.map((component) =>
        component.id === id
          ? {
              ...component,
              previewStatus: 'error',
              previewError: (error as Error).message
            }
          : component
      )
    );
    throw error;
  }
}

/**
 * After Edit layout closes: dirty components show as generating at once, then, once `saved`
 * (the editor's own pending saves) settles, their previews are regenerated from the new nodes.
 */
export async function flushDirtyPreviews(saved: Promise<void>) {
  const ids = [...dirtyPreviewIds];
  dirtyPreviewIds.clear();
  if (!ids.length) return;
  markPending(new Set(ids));
  await saved;
  const results = await Promise.allSettled(ids.map((id) => refineComponent(id)));
  const failed = results.find((result) => result.status === 'rejected');
  if (failed && failed.status === 'rejected') {
    toast.error((failed.reason as Error)?.message ?? 'Could not refine a component preview');
  }
}

/**
 * Vibe edit: the AI rewrites the component's structure from `prompt`, every instance picks it up,
 * then the preview is regenerated in the background. Resolves with the model's summary.
 */
export async function vibeEditComponent(id: string, prompt: string): Promise<string> {
  const previous = getQueryClient()
    .getQueryData<DesignComponent[]>(designKeys.components())
    ?.find((component) => component.id === id);
  dirtyPreviewIds.delete(id);
  markPending(new Set([id]));
  try {
    const { component, summary } = await requestVibeEdit(id, { prompt });
    replaceComponent({ ...component, previewStatus: 'pending', previewError: null });
    const change = `Requested: ${prompt}\nApplied: ${summary}`.slice(0, 3000);
    void refineComponent(id, change).catch((error) => {
      toast.error((error as Error).message ?? 'Could not regenerate the component preview');
    });
    return summary;
  } catch (error) {
    if (previous) replaceComponent(previous);
    throw error;
  }
}

/** Turns `node` into a new library component; the caller links the node to it. */
export async function makeReusable(node: UiNode): Promise<DesignComponent> {
  const component = await createComponent({
    name: componentName(node),
    node: toComponentNode(node)
  });
  updateComponentsCache((components) => [...components, component]);
  void refineComponent(component.id).catch((error) => {
    toast.error((error as Error).message ?? 'Could not generate the component preview');
  });
  return component;
}

export async function removeComponent(id: string) {
  dirtyPreviewIds.delete(id);
  await deleteComponent(id);
  updateComponentsCache((components) => components.filter((component) => component.id !== id));
}

/** Content edits made through instances: applied to the cache at once, saved after a pause. */
export function useComponentSaves() {
  const pendingRef = useRef(new Map<string, UiNode>());
  const { state, schedule, flush } = useDebouncedSave<Map<string, UiNode>>(async (batch) => {
    for (const [id, node] of batch) {
      if (pendingRef.current.get(id) === node) pendingRef.current.delete(id);
    }
    const saved = await Promise.all(
      [...batch].map(([id, node]) => updateComponent(id, { name: componentName(node), node }))
    );
    return saved.reduce(
      (latest, component) => (component.updatedAt > latest ? component.updatedAt : latest),
      NEVER_SAVED
    );
  }, NEVER_SAVED);

  function saveComponents(changed: Map<string, UiNode>) {
    if (!changed.size) return;
    markComponentsDirty(changed.keys());
    updateComponentsCache((components) =>
      components.map((component) => {
        const node = changed.get(component.id);
        return node ? { ...component, name: componentName(node), node } : component;
      })
    );
    for (const [id, node] of changed) pendingRef.current.set(id, node);
    schedule(new Map(pendingRef.current));
  }

  return { state, saveComponents, flush };
}

/**
 * Layout edits made on a preview: every instance shows them at once, saved after a pause. The
 * component's structure is unchanged, so the preview isn't regenerated.
 */
export function useComponentPreviewSaves() {
  const pendingRef = useRef(new Map<string, string>());
  const { state, schedule } = useDebouncedSave<Map<string, string>>(async (batch) => {
    for (const [id, html] of batch) {
      if (pendingRef.current.get(id) === html) pendingRef.current.delete(id);
    }
    const saved = await Promise.all(
      [...batch].map(([id, previewHtml]) => updateComponent(id, { previewHtml }))
    );
    return saved.reduce(
      (latest, component) => (component.updatedAt > latest ? component.updatedAt : latest),
      NEVER_SAVED
    );
  }, NEVER_SAVED);

  function savePreview(id: string, previewHtml: string) {
    updateComponentsCache((components) =>
      components.map((component) =>
        component.id === id ? { ...component, previewHtml } : component
      )
    );
    pendingRef.current.set(id, previewHtml);
    schedule(new Map(pendingRef.current));
  }

  return { state, savePreview };
}
