'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TOOLBAR_BUTTON_CLASS_NAME } from '@/components/whiteboard';
import { cn } from '@/lib/utils';
import { designSectionsQueryOptions } from '../../api/queries';
import type { DesignComponent } from '../../api/types';
import { componentTone, componentUsage } from '../../lib/components';
import { NODE_LABELS } from '../../lib/node-tree';
import { removeComponent, useDesignComponents } from '../../lib/use-components';
import { ComponentPreviewSkeleton } from './component-preview-frame';
import { NODE_ICONS } from './node-icons';
import { SketchPreview } from './sketch';
import { NODE_DRAG_MIME, nodeDragValue } from './wireframe-context';

/** The sketch is drawn at a phone's width, then zoomed to the card's width. */
const PREVIEW_WIDTH = 320;

/** Zooms its content to the box's width; content taller than the card is cut off at the bottom. */
function FitToWidth({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const fit = () => {
      if (box.clientWidth) setZoom(box.clientWidth / PREVIEW_WIDTH);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className='w-full shrink-0'>
      <div style={{ zoom, width: PREVIEW_WIDTH }}>{children}</div>
    </div>
  );
}

interface ComponentsPanelProps {
  /** Click-to-add, into the selected container or the page root. */
  onAdd: (component: DesignComponent) => void;
  onDragEnd?: () => void;
  onClose: () => void;
  /** Where the cards can be dropped, under the search. */
  hint?: string;
  className?: string;
}

/** The reusable components of every section, as cards to drag or click into the screen. */
export function ComponentsPanel({
  onAdd,
  onDragEnd,
  onClose,
  hint,
  className
}: ComponentsPanelProps) {
  const { components } = useDesignComponents();
  const { data: sections } = useSuspenseQuery(designSectionsQueryOptions());
  const usage = useMemo(() => componentUsage(sections), [sections]);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<DesignComponent | null>(null);
  const [pending, setPending] = useState(false);

  const search = query.trim().toLowerCase();
  const shown = search
    ? components.filter((component) => component.name.toLowerCase().includes(search))
    : components;

  async function confirmDelete() {
    if (!deleting) return;
    setPending(true);
    try {
      await removeComponent(deleting.id);
      setDeleting(null);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <aside
      aria-label='Reusable components'
      className={cn(
        'bg-popover/85 flex w-[min(18rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-xl border shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35),0_2px_6px_rgb(0_0_0/0.08)] backdrop-blur-md',
        className
      )}
    >
      <div
        className='flex shrink-0 items-center gap-2 border-b py-2 pr-2 pl-3'
        style={{ backgroundColor: componentTone(0.12) }}
      >
        <Icons.component className='size-4 shrink-0' style={{ color: componentTone() }} />
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium'>Reusable components</p>
          <p className='text-[11px] tracking-wide uppercase' style={{ color: componentTone() }}>
            Every section
          </p>
        </div>
        <Button variant='ghost' size='icon' className='size-7' onClick={onClose}>
          <Icons.close className='size-4' />
          <span className='sr-only'>Close reusable components</span>
        </Button>
      </div>

      {components.length > 0 ? (
        <div className='shrink-0 border-b p-2'>
          <div className='relative'>
            <Icons.search className='text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2' />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Search components'
              aria-label='Search components'
              className='h-8 pl-7 text-sm'
            />
          </div>
          {hint ? <p className='text-muted-foreground mt-1.5 px-0.5 text-[11px]'>{hint}</p> : null}
        </div>
      ) : null}

      <div className='min-h-0 overflow-y-auto p-2'>
        {components.length === 0 ? (
          <p className='text-muted-foreground px-2 py-6 text-center text-xs'>
            Select an element and use the component button in its properties header to make it
            reusable.
          </p>
        ) : shown.length === 0 ? (
          <p className='text-muted-foreground px-2 py-6 text-center text-xs'>
            No component matches “{query.trim()}”.
          </p>
        ) : (
          <div className='flex flex-col gap-2'>
            {shown.map((component) => (
              <ComponentCard
                key={component.id}
                component={component}
                screens={usage.get(component.id) ?? 0}
                onAdd={() => onAdd(component)}
                onDragEnd={onDragEnd}
                onDelete={() => setDeleting(component)}
              />
            ))}
          </div>
        )}
      </div>

      <AlertModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        loading={pending}
        title={`Delete “${deleting?.name ?? ''}”?`}
        description='It leaves the library. Screens that use it keep their copy as plain elements.'
        confirmLabel='Delete component'
      />
    </aside>
  );
}

interface ComponentCardProps {
  component: DesignComponent;
  screens: number;
  onAdd: () => void;
  onDragEnd?: () => void;
  onDelete: () => void;
}

function ComponentCard({ component, screens, onAdd, onDragEnd, onDelete }: ComponentCardProps) {
  const NodeIcon = NODE_ICONS[component.node.type];
  return (
    <div
      draggable
      role='button'
      tabIndex={0}
      aria-label={`Add ${component.name}`}
      onDragStart={(event) => {
        event.dataTransfer.setData(NODE_DRAG_MIME, nodeDragValue({ componentId: component.id }));
        event.dataTransfer.effectAllowed = 'copy';
      }}
      onDragEnd={onDragEnd}
      onClick={onAdd}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onAdd();
      }}
      className='group bg-background/60 hover:bg-accent/40 relative flex cursor-grab flex-col overflow-hidden rounded-lg border text-left transition-colors active:cursor-grabbing'
    >
      <div
        aria-hidden
        className='pointer-events-none relative flex h-24 flex-col justify-center-safe overflow-hidden border-b p-1.5 [&_iframe]:pointer-events-none!'
        style={{ backgroundColor: componentTone(0.05) }}
      >
        <FitToWidth>
          {component.previewStatus === 'pending' ? (
            <ComponentPreviewSkeleton previousHtml={component.previewHtml} />
          ) : component.previewStatus === 'ready' && component.previewHtml ? (
            <SketchPreview
              node={component.node}
              width={PREVIEW_WIDTH}
              previewHtml={component.previewHtml}
            />
          ) : (
            <SketchPreview node={component.node} width={PREVIEW_WIDTH} />
          )}
        </FitToWidth>
      </div>
      <div className='flex items-center gap-1.5 px-2 py-1.5'>
        <NodeIcon className='size-3.5 shrink-0' style={{ color: componentTone() }} />
        <div className='min-w-0 flex-1'>
          <p className='truncate text-xs font-medium'>{component.name}</p>
          <p className='text-muted-foreground truncate text-[10px]'>
            {NODE_LABELS[component.node.type]} · {screens === 1 ? '1 screen' : `${screens} screens`}
          </p>
        </div>
      </div>
      <Button
        variant='secondary'
        size='icon'
        aria-label={`Delete ${component.name}`}
        className='absolute top-1 right-1 size-6 opacity-0 shadow-sm group-hover:opacity-100 focus-visible:opacity-100'
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        <Icons.trash className='size-3.5' />
      </Button>
    </div>
  );
}

interface ComponentsToolbarButtonProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * Opens the reusable components from the free design toolbar, set apart from the drawing tools.
 * Its violet look lives with the toolbar's styles in globals.css.
 */
export function ComponentsToolbarButton({ open, onToggle }: ComponentsToolbarButtonProps) {
  return (
    <>
      <span aria-hidden className='bg-border w-1.5 shrink-0 self-stretch dark:bg-white/10' />
      <button
        type='button'
        title='Reusable components'
        aria-label='Reusable components'
        aria-pressed={open}
        onClick={onToggle}
        className={cn(TOOLBAR_BUTTON_CLASS_NAME, 'App-toolbar__components')}
      >
        <div className='ToolIcon__icon' aria-hidden='true'>
          <Icons.component stroke={1.75} />
        </div>
      </button>
    </>
  );
}
