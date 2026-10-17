'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type {
  DesignComponent,
  InterfaceScreen,
  LayoutAlign,
  NodeLayout,
  UiNode
} from '../../api/types';
import { designSectionsQueryOptions } from '../../api/queries';
import { componentTone, componentUsage, enclosingInstance, isInstance } from '../../lib/components';
import { scrollPinOf } from '../../lib/fixed-layer';
import { layoutWidth, NODE_LABELS, updateNodeProperties } from '../../lib/node-tree';
import { useDesignComponents, vibeEditComponent } from '../../lib/use-components';
import { ChoiceRow, type ChoiceOption } from './property-controls';

const WIDTH_MODES: readonly ChoiceOption<'fill' | 'hug' | 'percent'>[] = [
  { value: 'fill', label: 'Fill', icon: Icons.widthFill, text: 'Fill' },
  { value: 'hug', label: 'Hug', icon: Icons.widthHug, text: 'Hug' },
  { value: 'percent', label: 'Percent', icon: Icons.percentage, text: '%' }
];

const WIDTH_PERCENTS = [20, 25, 33, 40, 50, 60, 66, 75, 80];

const ALIGN: readonly ChoiceOption<LayoutAlign | 'parent'>[] = [
  { value: 'parent', label: 'As parent', icon: Icons.circleDashed },
  { value: 'start', label: 'Start', icon: Icons.alignLeft },
  { value: 'center', label: 'Center', icon: Icons.alignCenter },
  { value: 'end', label: 'End', icon: Icons.alignRight },
  { value: 'stretch', label: 'Stretch', icon: Icons.arrowsHorizontal }
];

const PIN_HINTS = {
  'fixed-top': 'First on the page — pinned to the top of the screen.',
  'fixed-bottom': 'Last on the page — pinned to the bottom of the screen.',
  sticky: 'Sticks to the top while the page scrolls.'
} as const;

function canonicalId(id: string): string {
  const sep = id.indexOf('~');
  return sep >= 0 ? id.slice(sep + 1) : id;
}

function StatusBadge({ component }: { component: DesignComponent }) {
  if (component.previewStatus === 'ready') {
    return (
      <span className='text-muted-foreground inline-flex items-center gap-1 text-[11px]'>
        <Icons.check className='size-3.5 text-emerald-600' /> Preview ready
      </span>
    );
  }
  if (component.previewStatus === 'error') {
    return (
      <span className='text-destructive inline-flex items-center gap-1 text-[11px]'>
        <Icons.warning className='size-3.5' />
        {component.previewError || 'Preview failed'}
      </span>
    );
  }
  return (
    <span className='text-muted-foreground inline-flex items-center gap-1 text-[11px]'>
      <Icons.spinner className='size-3.5 animate-spin' /> Generating preview…
    </span>
  );
}

/** The instance `node` is or belongs to, and its library component. */
function useOwningComponent(node: UiNode, nodes: UiNode[]) {
  const { byId } = useDesignComponents();
  const instance = isInstance(node) ? node : enclosingInstance(nodes, node.id);
  const componentId = instance?.properties?.componentId;
  return { instance, component: componentId ? byId.get(componentId) : undefined };
}

interface ComponentNoticeProps {
  node: UiNode;
  nodes: UiNode[];
  /** Leaves Edit layout, which regenerates the preview. */
  onDone?: () => void;
}

/** Heads the normal editor in Edit layout: edits here change the component everywhere. */
export function ComponentNotice({ node, nodes, onDone }: ComponentNoticeProps) {
  const { component } = useOwningComponent(node, nodes);
  const { data: sections } = useSuspenseQuery(designSectionsQueryOptions());
  if (!component) return null;
  const screens = componentUsage(sections).get(component.id) ?? 0;
  return (
    <div
      className='space-y-1 border-b px-3 py-2.5'
      style={{ backgroundColor: componentTone(0.06) }}
    >
      <div className='flex items-center gap-2'>
        <p
          className='flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium'
          style={{ color: componentTone() }}
        >
          <Icons.component className='size-3.5 shrink-0' />
          <span className='truncate'>{component.name}</span>
        </p>
        {onDone ? (
          <Button size='xs' onClick={onDone}>
            <Icons.check /> Done
          </Button>
        ) : null}
      </div>
      <p className='text-muted-foreground text-[11px] leading-snug'>
        {isInstance(node) ? 'Changes to this component' : 'Changes to this part'} apply everywhere
        it is used
        {screens > 1 ? ` — ${screens} screens` : ''}. Its preview refreshes when you finish editing
        the layout.
      </p>
      <StatusBadge component={component} />
    </div>
  );
}

interface VibeEditComposerProps {
  componentId: string;
  onClose: () => void;
  onApplied: (summary: string) => void;
}

/** Prompt box for a vibe edit: the AI changes the structure, then the preview regenerates. */
function VibeEditComposer({ componentId, onClose, onApplied }: VibeEditComposerProps) {
  const promptId = useId();
  const [prompt, setPrompt] = useState('');
  const [isApplying, startApplying] = useTransition();
  const request = prompt.trim();

  function apply() {
    if (!request || isApplying) return;
    startApplying(async () => {
      try {
        onApplied(await vibeEditComponent(componentId, request));
      } catch (error) {
        toast.error((error as Error).message || 'Could not apply the vibe edit');
      }
    });
  }

  return (
    <div
      className='space-y-2 rounded-md border p-2.5'
      style={{ borderColor: componentTone(0.45), backgroundColor: componentTone(0.04) }}
    >
      <Label htmlFor={promptId} className='text-xs'>
        What should change?
      </Label>
      <Textarea
        id={promptId}
        autoFocus
        rows={3}
        maxLength={2000}
        value={prompt}
        disabled={isApplying}
        placeholder='Describe the change, e.g. turn the collapse button into a text link'
        className='min-h-20 text-xs md:text-xs'
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            apply();
          } else if (event.key === 'Escape' && !isApplying) {
            event.stopPropagation();
            onClose();
          }
        }}
      />
      <div className='flex items-center gap-2'>
        <span className='text-muted-foreground flex-1 text-[10px]'>⌘/Ctrl + Enter to apply</span>
        <Button variant='ghost' size='xs' disabled={isApplying} onClick={onClose}>
          Cancel
        </Button>
        <Button size='xs' disabled={!request || isApplying} onClick={apply}>
          {isApplying ? <Icons.spinner className='animate-spin' /> : <Icons.sparkles />}
          {isApplying ? 'Applying…' : 'Apply'}
        </Button>
      </div>
    </div>
  );
}

interface ComponentDetailsPanelProps {
  node: UiNode;
  screen: InterfaceScreen;
  onScreenChange: (updates: Partial<InterfaceScreen>) => void;
  /** Opens Edit layout with this instance selected. */
  onEdit?: (instanceId: string) => void;
}

/**
 * Read-only details for a reusable component (or a part inside one) outside Edit layout:
 * description, parts, and instance placement.
 */
export function ComponentDetailsPanel({
  node,
  screen,
  onScreenChange,
  onEdit
}: ComponentDetailsPanelProps) {
  const { instance, component } = useOwningComponent(node, screen.nodes);
  const fixedId = useId();
  const growId = useId();
  const [vibeOpen, setVibeOpen] = useState(false);
  const [vibeSummary, setVibeSummary] = useState<string | null>(null);
  const inside = !isInstance(node);
  const partId = inside ? canonicalId(node.id) : null;
  const part = partId ? component?.parts.find((item) => item.id === partId) : undefined;

  function updateLayout(updates: Partial<NodeLayout>) {
    if (!instance) return;
    const layout = { ...instance.properties?.layout, ...updates };
    onScreenChange({
      nodes: updateNodeProperties(screen.nodes, instance.id, { layout })
    });
  }

  if (!component || !instance) {
    return (
      <div className='text-muted-foreground space-y-2 p-3 text-xs'>
        <p>This element belongs to a reusable component that is no longer in the library.</p>
      </div>
    );
  }

  const layout = instance.properties?.layout ?? {};
  const width = layoutWidth(instance);
  const pin = scrollPinOf(instance, screen.nodes);
  const percents =
    typeof width === 'number' && !WIDTH_PERCENTS.includes(width)
      ? [...WIDTH_PERCENTS, width].toSorted((a, b) => a - b)
      : WIDTH_PERCENTS;

  const toneStyle = { borderColor: componentTone(0.45), color: componentTone() };

  return (
    <div className='space-y-4 p-3'>
      <div className='space-y-2'>
        <div className='flex gap-2'>
          {onEdit ? (
            <Button
              variant='outline'
              size='sm'
              className='flex-1'
              style={toneStyle}
              onClick={() => onEdit(instance.id)}
            >
              <Icons.edit /> Manual edit
            </Button>
          ) : null}
          <Button
            variant='outline'
            size='sm'
            className='flex-1'
            style={toneStyle}
            disabled={vibeOpen || component.previewStatus === 'pending'}
            onClick={() => {
              setVibeSummary(null);
              setVibeOpen(true);
            }}
          >
            <Icons.sparkles /> Vibe edit
          </Button>
        </div>
        {vibeOpen ? (
          <VibeEditComposer
            componentId={component.id}
            onClose={() => setVibeOpen(false)}
            onApplied={(summary) => {
              setVibeOpen(false);
              setVibeSummary(summary);
            }}
          />
        ) : null}
        {vibeSummary ? (
          <p
            className='flex items-start gap-1.5 text-[11px] leading-snug'
            style={{ color: componentTone() }}
          >
            <Icons.sparkles className='mt-px size-3.5 shrink-0' />
            {vibeSummary}
          </p>
        ) : null}
      </div>
      <div className='space-y-1.5'>
        <p className='text-xs font-medium' style={{ color: componentTone() }}>
          {component.name}
        </p>
        <StatusBadge component={component} />
        <p className='text-muted-foreground text-[11px] leading-snug'>
          {inside ? 'Part of this component.' : 'Linked instance.'} Edit it by hand, or describe a
          change for AI to apply. Changes apply everywhere it is used and the preview refreshes
          afterwards.
        </p>
      </div>

      {inside && part ? (
        <div className='bg-muted/30 space-y-1 rounded-md border p-3'>
          <p className='text-xs font-medium'>{part.label}</p>
          <p className='text-muted-foreground text-[11px] leading-snug'>{part.summary}</p>
        </div>
      ) : null}

      {component.description ? (
        <div className='space-y-1'>
          <p className='text-muted-foreground text-[11px] tracking-wide uppercase'>Description</p>
          <p className='text-xs leading-relaxed'>{component.description}</p>
        </div>
      ) : null}

      {component.parts.length > 0 ? (
        <div className='space-y-2'>
          <p className='text-muted-foreground text-[11px] tracking-wide uppercase'>Parts</p>
          <ul className='space-y-2'>
            {component.parts.map((item) => (
              <li
                key={item.id}
                className={
                  partId === item.id
                    ? 'rounded-md border p-2'
                    : 'border-transparent rounded-md border p-2'
                }
                style={
                  partId === item.id
                    ? { borderColor: componentTone(0.45), backgroundColor: componentTone(0.08) }
                    : undefined
                }
              >
                <p className='text-xs font-medium'>{item.label}</p>
                <p className='text-muted-foreground text-[11px] leading-snug'>{item.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!inside ? (
        <div className='bg-muted/30 space-y-3 rounded-md border p-3'>
          <p className='text-xs font-medium'>Instance placement</p>
          <ChoiceRow
            label='Width'
            value={typeof width === 'number' ? 'percent' : width}
            options={WIDTH_MODES}
            onChange={(mode) =>
              updateLayout({
                width: mode === 'percent' ? (typeof width === 'number' ? width : 50) : mode
              })
            }
          />
          {typeof width === 'number' ? (
            <NativeSelect
              className='w-full'
              aria-label='Share of parent width'
              value={String(width)}
              onChange={(event) => updateLayout({ width: Number(event.target.value) })}
            >
              {percents.map((percent) => (
                <NativeSelectOption key={percent} value={String(percent)}>
                  {percent}% of parent
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : null}
          <ChoiceRow
            label='Align self'
            value={layout.alignSelf ?? 'parent'}
            options={ALIGN}
            onChange={(value) =>
              updateLayout({ alignSelf: value === 'parent' ? undefined : value })
            }
          />
          <div className='flex items-center justify-between gap-3'>
            <Label htmlFor={fixedId} className='text-xs font-normal'>
              Fixed / sticky on scroll
            </Label>
            <Switch
              id={fixedId}
              checked={layout.fixed ?? false}
              onCheckedChange={(fixed) =>
                updateLayout({
                  fixed: fixed || undefined,
                  ...(fixed ? { anchor: undefined } : {})
                })
              }
            />
          </div>
          {pin ? (
            <p className='text-muted-foreground text-[11px] leading-snug'>{PIN_HINTS[pin]}</p>
          ) : null}
          <div className='flex items-center justify-between gap-3'>
            <Label htmlFor={growId} className='text-xs font-normal'>
              Grow to fill remaining space
            </Label>
            <Switch
              id={growId}
              checked={layout.grow ?? false}
              onCheckedChange={(grow) => updateLayout({ grow: grow || undefined })}
            />
          </div>
          <p className='text-muted-foreground text-[11px]'>
            Type: {NODE_LABELS[component.node.type]}
          </p>
        </div>
      ) : null}
    </div>
  );
}
