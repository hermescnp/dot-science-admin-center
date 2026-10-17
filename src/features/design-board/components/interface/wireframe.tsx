'use client';

import {
  use,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject
} from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  SCREEN_HEIGHT_RANGE,
  SCREEN_SIZES,
  type ImageAspectRatio,
  type InputType,
  type InterfaceScreen,
  type NodeLayout,
  type NodeType,
  type UiNode,
  type ValueType
} from '../../api/types';
import {
  flowBoxAttributes,
  flowItemAttributes,
  flowOf,
  flowStyle,
  placementStyle,
  ROOT_FLOW,
  type Flow
} from '../../lib/layout-flow';
import {
  FixedLayerContext,
  FixedPortal,
  isScreenFixed,
  PageNodesContext,
  scrollPinOf,
  useFixedLayer
} from '../../lib/fixed-layer';
import { componentTone, isInstance } from '../../lib/components';
import { CONTAINER_TYPES, containerTone, findNode, isContainerVisible } from '../../lib/node-tree';
import { useAnchorClearance } from '../../lib/use-anchor-clearance';
import {
  DropIndicator,
  dropLabel,
  dropTargetAt,
  dropTargetKey,
  type DropTarget
} from './flow-drop';
import { useLayoutDrag, WidthHandle } from './layout-drag';
import { NODE_DRAG_MIME, pressProps, ROOT_DROP_ID, useWireframe } from './wireframe-context';

function hasNodeDrag(event: DragEvent) {
  return event.dataTransfer.types.includes(NODE_DRAG_MIME);
}

/**
 * Library and component drops on a screen: they land in the gap nearest the pointer, in the
 * innermost container under it, marked by an insertion line.
 */
function useScreenDrop() {
  const { editable, nodes, hover, drop } = useWireframe();
  const [target, setTarget] = useState<DropTarget | null>(null);
  const active = target !== null;

  useEffect(() => {
    if (!active) return;
    const clear = () => {
      setTarget(null);
      hover(null);
    };
    document.addEventListener('dragend', clear);
    document.addEventListener('drop', clear);
    return () => {
      document.removeEventListener('dragend', clear);
      document.removeEventListener('drop', clear);
    };
  }, [active, hover]);

  if (!editable) return { dropProps: {}, indicator: null };

  const resolve = (event: DragEvent) =>
    dropTargetAt(event.target as Element, event.clientX, event.clientY, nodes);
  const show = (next: DropTarget | null) => {
    setTarget((current) => (dropTargetKey(current) === dropTargetKey(next) ? current : next));
    hover(next ? (next.parentId ?? ROOT_DROP_ID) : null);
  };

  return {
    dropProps: {
      onDragOver: (event: DragEvent) => {
        if (!hasNodeDrag(event)) return;
        const next = resolve(event);
        show(next);
        if (!next) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      },
      onDragLeave: (event: DragEvent) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        show(null);
      },
      onDrop: (event: DragEvent) => {
        const value = event.dataTransfer.getData(NODE_DRAG_MIME);
        if (!value) return;
        event.preventDefault();
        const next = resolve(event);
        show(null);
        if (next) drop(next.parentId, value, next.kind === 'slot' ? next.index : undefined);
      }
    },
    indicator: target ? <DropIndicator target={target} label={dropLabel(nodes, target)} /> : null
  };
}

interface ElementShellProps {
  node: UiNode;
  className?: string;
  children: ReactNode;
}

function ElementShell({ node, className, children }: ElementShellProps) {
  const { editable, selectedId, hoveredId, select } = useWireframe();
  const container = CONTAINER_TYPES.has(node.type);
  const dependent = node.properties?.dependency === 'dependent';
  const selected = editable && selectedId === node.id;
  const instance = isInstance(node);
  const drag = useLayoutDrag(node);

  return (
    <div
      data-node-id={node.id}
      style={
        instance ? { outline: `1px solid ${componentTone(0.6)}`, outlineOffset: 2 } : undefined
      }
      className={cn(
        'relative max-w-full rounded-md transition-shadow',
        editable && 'cursor-pointer',
        selected && 'nodrag nopan cursor-grab select-none',
        drag.dragging && 'cursor-grabbing opacity-50',
        dependent && 'outline-primary/50 outline-1 outline-offset-2 outline-dashed',
        selectedId === node.id && 'ring-primary ring-2 ring-offset-2 ring-offset-transparent',
        container && hoveredId === node.id && 'ring-primary/60 bg-primary/5 ring-2',
        className
      )}
      {...(editable
        ? pressProps((event) => {
            event.stopPropagation();
            select(node.id);
          })
        : {})}
      {...drag.dragProps}
    >
      {children}
      {instance ? (
        <span
          title='Component instance'
          className='bg-background pointer-events-none absolute -top-2 -right-2 z-1 flex size-4 items-center justify-center rounded-full border'
          style={{ color: componentTone(), borderColor: componentTone(0.6) }}
        >
          <Icons.component className='size-2.5' />
        </span>
      ) : null}
      <WidthHandle node={node} />
      {drag.overlay}
    </div>
  );
}

function DependencyBadge({ node }: { node: UiNode }) {
  const { nodes } = useWireframe();
  if (node.properties?.dependency !== 'dependent') return null;
  const source = node.properties.dependsOn ? findNode(nodes, node.properties.dependsOn) : null;
  return (
    <span
      className='text-primary inline-flex items-center gap-0.5 text-[10px]'
      title={source ? `Depends on ${source.label}` : 'Dependent'}
    >
      <Icons.link className='size-3' />
      {source ? source.label : 'Dependent'}
    </span>
  );
}

/** An empty container's placeholder; drops on it go inside `nodeId`. */
function EmptySlot({ nodeId, children }: { nodeId: string; children: ReactNode }) {
  return (
    <div
      data-drop-inside={nodeId}
      className='text-muted-foreground flex h-12 items-center justify-center gap-2 text-[11px]'
    >
      <span className='font-serif text-base not-italic'>∅</span>
      {children}
    </div>
  );
}

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';
const subscript = (value: number) =>
  String(value)
    .split('')
    .map((digit) => SUBSCRIPTS[Number(digit)])
    .join('');

interface SetFrameProps {
  node: UiNode;
  /** Notation naming the kind of grouping, set on the border next to the label. */
  symbol: string;
  dashed?: boolean;
  children: ReactNode;
}

/** A container drawn as a set: a hairline region whose label sits on its boundary. */
function SetFrame({ node, symbol, dashed, children }: SetFrameProps) {
  return (
    <ElementShell node={node} className='rounded-2xl'>
      <fieldset
        style={{
          borderColor: containerTone(node.type, 0.45) ?? undefined,
          backgroundColor: containerTone(node.type, 0.04) ?? undefined
        }}
        className={cn(
          'relative min-w-0 rounded-2xl border px-2.5 pt-3 pb-2.5',
          dashed && 'border-dashed'
        )}
      >
        <legend className='mr-auto ml-2 max-w-[90%] px-1.5 text-left'>
          <span
            style={{ color: containerTone(node.type) ?? undefined }}
            className='flex items-baseline gap-1.5 leading-none'
          >
            {node.label ? <span className='truncate text-sm font-medium'>{node.label}</span> : null}
            <span className='shrink-0 font-serif text-xs opacity-70'>{symbol}</span>
            {isContainerVisible(node) ? null : (
              <span title='Invisible container: hidden in the free design preview'>
                <Icons.eyeOff className='size-3 shrink-0 self-center opacity-70' />
              </span>
            )}
            <DependencyBadge node={node} />
          </span>
        </legend>
        {children}
      </fieldset>
    </ElementShell>
  );
}

interface WireframeChildrenProps {
  /** The node whose children these are; null for the page root. Drops land in its children. */
  parentId: string | null;
  nodes: UiNode[];
  /** The containing node's layout; its flow is used unless `flow` overrides it. */
  layout?: NodeLayout;
  flow?: Flow;
  className?: string;
}

/** Lays out children in their container's flow; consecutive column layouts form one product row. */
export function WireframeChildren({
  parentId,
  nodes,
  layout,
  flow = flowOf(layout),
  className
}: WireframeChildrenProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const pageNodes = use(PageNodesContext);
  useAnchorClearance(boxRef, nodes);
  const items: ReactNode[] = [];
  for (let index = 0; index < nodes.length; ) {
    const columns: UiNode[] = [];
    while (nodes[index]?.type === 'column-layout') columns.push(nodes[index++]);
    if (columns.length) {
      items.push(<ColumnRow key={columns[0].id} parentId={parentId} columns={columns} />);
    } else {
      const node = nodes[index++];
      const pin = scrollPinOf(node, pageNodes);
      items.push(
        <FixedPortal key={node.id} node={node}>
          <div
            {...flowItemAttributes(node)}
            style={placementStyle(node, flow, pin)}
            className={cn((isScreenFixed(pin) || pin === 'sticky') && 'bg-card')}
          >
            <WireframeNode node={node} />
          </div>
        </FixedPortal>
      );
    }
  }
  return (
    <div
      ref={boxRef}
      {...flowBoxAttributes(flow)}
      data-flow-parent={parentId ?? ROOT_DROP_ID}
      style={flowStyle(layout, flow)}
      className={cn('relative', className)}
    >
      {items}
    </div>
  );
}

const COLUMN_FLOW: Flow = { direction: 'row', align: 'stretch' };

/** Side-by-side column layouts drawn as a product A × B × …. */
function ColumnRow({ parentId, columns }: { parentId: string | null; columns: UiNode[] }) {
  const grow = columns.some((column) => column.properties?.layout?.grow);
  return (
    <div
      {...flowItemAttributes(columns[0], columns[columns.length - 1])}
      {...flowBoxAttributes(COLUMN_FLOW)}
      data-flow-parent={parentId ?? ROOT_DROP_ID}
      style={{ flex: grow ? '1 1 0' : undefined }}
      className='flex min-w-0 items-stretch gap-1 self-stretch'
    >
      {columns.flatMap((column, index) => [
        ...(index > 0
          ? [
              <span
                key={`${column.id}-times`}
                className='text-muted-foreground shrink-0 self-center font-serif text-xs'
              >
                ×
              </span>
            ]
          : []),
        <div
          key={column.id}
          {...flowItemAttributes(column)}
          style={placementStyle(column, COLUMN_FLOW)}
        >
          <ColumnLayout node={column} index={index} />
        </div>
      ])}
    </div>
  );
}

function WireframeNode({ node }: { node: UiNode }) {
  switch (node.type) {
    case 'section':
      return <SectionBlock node={node} />;
    case 'form':
      return <FormBlock node={node} />;
    case 'list':
      return <ListBlock node={node} />;
    case 'tabs-bar':
      return <TabsBar node={node} />;
    case 'column-layout':
      return <ColumnLayout node={node} index={0} />;
    case 'button':
      return <ButtonElement node={node} />;
    case 'field':
      return <FieldElement node={node} />;
    case 'text':
      return <TextElement node={node} />;
    case 'data-display':
      return <DataDisplay node={node} />;
    case 'search-bar':
      return <SearchBar node={node} />;
    case 'image-carousel':
      return <ImageCarousel node={node} />;
  }
}

function SectionBlock({ node }: { node: UiNode }) {
  return (
    <SetFrame node={node} symbol='{·}'>
      {node.children.length ? (
        <WireframeChildren
          parentId={node.id}
          nodes={node.children}
          layout={node.properties?.layout}
        />
      ) : (
        <EmptySlot nodeId={node.id}>empty set</EmptySlot>
      )}
    </SetFrame>
  );
}

function FormBlock({ node }: { node: UiNode }) {
  return (
    <SetFrame node={node} symbol='⟨·⟩'>
      {node.children.length ? (
        <WireframeChildren
          parentId={node.id}
          nodes={node.children}
          layout={node.properties?.layout}
        />
      ) : (
        <EmptySlot nodeId={node.id}>no inputs</EmptySlot>
      )}
    </SetFrame>
  );
}

function ColumnLayout({ node, index }: { node: UiNode; index: number }) {
  return (
    <SetFrame node={node} symbol={`π${subscript(index + 1)}`} dashed>
      {node.children.length ? (
        <WireframeChildren
          parentId={node.id}
          nodes={node.children}
          layout={node.properties?.layout}
        />
      ) : (
        <EmptySlot nodeId={node.id}>empty factor</EmptySlot>
      )}
    </SetFrame>
  );
}

/** A sequence (xᵢ): the item template is drawn once and indexed instead of repeated. */
function ListBlock({ node }: { node: UiNode }) {
  const dynamic = node.properties?.isDynamicList ?? false;
  const upper = dynamic ? 'n' : String(node.properties?.itemCount ?? 3);
  const itemFlow = flowOf(undefined, node.properties?.layout?.itemDirection);
  if (itemFlow.direction === 'row') itemFlow.align = 'center';
  return (
    <SetFrame node={node} symbol='(xᵢ)'>
      {node.children.length ? (
        <div className='space-y-2'>
          <div className='flex gap-2'>
            <span className='text-muted-foreground pt-0.5 font-serif text-[11px] italic'>xᵢ</span>
            <div className='min-w-0 flex-1'>
              <WireframeChildren parentId={node.id} nodes={node.children} flow={itemFlow} />
            </div>
          </div>
          <div className='text-muted-foreground flex items-center gap-2 font-serif text-[11px] italic'>
            <span className='border-foreground/20 flex-1 border-t border-dashed' />
            <span>i = 1, …, {upper}</span>
            <span className='border-foreground/20 flex-1 border-t border-dashed' />
          </div>
        </div>
      ) : (
        <EmptySlot nodeId={node.id}>no item template</EmptySlot>
      )}
      {node.properties?.hasMoreIndicator ? (
        <div className='text-muted-foreground pt-2 text-center font-serif text-[11px]'>
          ⋯ load more
        </div>
      ) : null}
    </SetFrame>
  );
}

function TabsBar({ node }: { node: UiNode }) {
  const { editable, updateProperties } = useWireframe();
  const tabs = node.children.filter((child) => child.type === 'section');
  const others = node.children.filter((child) => child.type !== 'section');
  const selectedIndex = Math.min(
    node.properties?.selectedTabIndex ?? 0,
    Math.max(0, tabs.length - 1)
  );
  const selected = tabs[selectedIndex];

  return (
    <SetFrame node={node} symbol='⊔'>
      {tabs.length ? (
        <>
          <div className='border-foreground/10 flex overflow-x-auto border-b [&>:first-child]:ml-auto [&>:last-child]:mr-auto'>
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                type='button'
                onClick={(event) => {
                  if (!editable) return;
                  event.stopPropagation();
                  updateProperties(node.id, { selectedTabIndex: index });
                }}
                className={cn(
                  '-mb-px shrink-0 border-b px-2.5 py-1 text-xs whitespace-nowrap',
                  index === selectedIndex
                    ? 'border-foreground text-foreground'
                    : 'text-muted-foreground border-transparent'
                )}
              >
                {tab.label}
                <span className='font-serif opacity-60'>{subscript(index + 1)}</span>
              </button>
            ))}
          </div>
          <div className='pt-2.5'>
            {selected?.children.length ? (
              <WireframeChildren
                parentId={selected.id}
                nodes={selected.children}
                layout={selected.properties?.layout}
              />
            ) : selected ? (
              <EmptySlot nodeId={selected.id}>empty component – drop elements here</EmptySlot>
            ) : null}
          </div>
        </>
      ) : (
        <EmptySlot nodeId={node.id}>add sections to form the union</EmptySlot>
      )}
      {others.length ? (
        <div className='border-foreground/10 mt-2.5 border-t border-dashed pt-2.5'>
          <WireframeChildren parentId={node.id} nodes={others} layout={node.properties?.layout} />
        </div>
      ) : null}
    </SetFrame>
  );
}

function ButtonElement({ node }: { node: UiNode }) {
  const { layerTitles } = useWireframe();
  const type = node.properties?.buttonType ?? 'primary';
  const travelTo = node.properties?.travelTo ? layerTitles.get(node.properties.travelTo) : null;

  let control: ReactNode;
  switch (type) {
    case 'image':
      control = (
        <span className='border-foreground/30 flex size-10 items-center justify-center rounded-full border'>
          <ImageGlyph />
        </span>
      );
      break;
    case 'floating-action':
      control = (
        <span className='border-foreground/60 flex size-10 items-center justify-center rounded-full border-[1.5px] font-serif text-lg leading-none'>
          +
        </span>
      );
      break;
    case 'toggle':
      control = (
        <span className='flex items-baseline gap-1.5 text-xs'>
          <span className='font-medium'>{node.label}</span>
          <span className='text-muted-foreground font-serif'>∈ {'{0, 1}'}</span>
        </span>
      );
      break;
    default:
      control = (
        <span
          className={cn(
            'inline-flex items-center text-xs font-medium',
            type === 'primary' && 'border-foreground/70 rounded-full border-[1.5px] px-3.5 py-1',
            type === 'basic' && 'border-foreground/25 rounded-full border px-3.5 py-1',
            type === 'tertiary' && 'text-muted-foreground',
            type === 'link' && 'decoration-foreground/40 underline underline-offset-2'
          )}
        >
          {node.label}
        </span>
      );
  }

  return (
    <ElementShell node={node} className='flex flex-col items-center gap-0.5'>
      <span title={node.properties?.behavior}>{control}</span>
      {travelTo ? (
        <span className='text-muted-foreground text-[10px]'>
          <span className='font-serif'>↦</span> {travelTo}
        </span>
      ) : null}
      <DependencyBadge node={node} />
    </ElementShell>
  );
}

/** The set a field's value is drawn from. */
const FIELD_DOMAINS: Record<InputType, string> = {
  text: 'Σ*',
  password: 'Σ*',
  number: 'ℝ',
  date: '𝔻',
  time: '𝕋',
  select: 'S',
  checkbox: '{0, 1}',
  radio: 'S',
  file: '𝔽',
  slider: '[0, 1]'
};

function fieldDomain(inputType: InputType, options: string[] | undefined) {
  if ((inputType === 'select' || inputType === 'radio') && options?.length) {
    const shown = options.slice(0, 3).join(', ');
    return `{${shown}${options.length > 3 ? ', …' : ''}}`;
  }
  return FIELD_DOMAINS[inputType];
}

function FieldElement({ node }: { node: UiNode }) {
  const inputType = node.properties?.inputType ?? 'text';
  const domain = fieldDomain(inputType, node.properties?.options);

  return (
    <ElementShell node={node} className='flex min-w-40 flex-col gap-1'>
      <span className='flex max-w-full items-baseline gap-1.5 text-xs'>
        <span className='truncate font-medium'>{node.label}</span>
        <span className='text-muted-foreground shrink-0 font-serif'>∈</span>
        <span className='text-muted-foreground truncate font-serif'>{domain}</span>
        <DependencyBadge node={node} />
      </span>
      {inputType === 'slider' ? (
        <span className='bg-foreground/25 relative h-px w-full'>
          <span className='bg-foreground absolute top-1/2 left-[30%] size-1.5 -translate-y-1/2 rounded-full' />
        </span>
      ) : (
        <span
          title={node.description}
          className='border-foreground/25 h-2 w-full border-b border-dashed'
        />
      )}
    </ElementShell>
  );
}

function TextElement({ node }: { node: UiNode }) {
  const content = node.properties?.content || node.label;
  return (
    <ElementShell node={node} className='flex flex-col'>
      {node.properties?.textStyle === 'title' ? (
        <h3 className='text-base leading-tight font-semibold'>{content}</h3>
      ) : (
        <p className='text-muted-foreground max-w-prose text-[11px] leading-relaxed'>{content}</p>
      )}
      <DependencyBadge node={node} />
    </ElementShell>
  );
}

/** The type a displayed value inhabits. */
const VALUE_TYPES: Record<ValueType, string> = {
  'item-id': 'id',
  'item-description': 'Σ*',
  amount: 'ℝ₊',
  state: 'σ',
  date: 't',
  quantity: 'ℕ'
};

function DataDisplay({ node }: { node: UiNode }) {
  const valueType = node.properties?.valueType ?? 'item-id';
  return (
    <ElementShell node={node} className='flex flex-col items-start'>
      <span className='border-foreground/30 flex items-baseline gap-1.5 border-b border-dotted pb-0.5 text-xs'>
        <span className='font-medium'>{node.label}</span>
        <span className='text-muted-foreground font-serif'>: {VALUE_TYPES[valueType]}</span>
      </span>
      <DependencyBadge node={node} />
    </ElementShell>
  );
}

function SearchBar({ node }: { node: UiNode }) {
  const style = node.properties?.searchBarStyle ?? 'simple';
  const query = node.properties?.placeholder || 'q';
  return (
    <ElementShell node={node} className='flex min-w-48 flex-col items-center gap-1'>
      <span className='border-foreground/30 flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-xs'>
        <span className='text-muted-foreground shrink-0 font-serif'>{'{ x | x ∼'}</span>
        <span className='text-muted-foreground min-w-0 truncate'>{query}</span>
        <span className='text-muted-foreground shrink-0 font-serif'>{'}'}</span>
        {style === 'with-voice' ? (
          <Icons.microphone className='text-muted-foreground size-3 shrink-0' />
        ) : null}
        {node.properties?.hasSearchButton ? <span className='shrink-0'>→</span> : null}
      </span>
      {style === 'with-filter' ? (
        <span className='text-muted-foreground font-serif text-[11px] italic'>∩ φ₁ ∩ φ₂ ∩ …</span>
      ) : null}
      <DependencyBadge node={node} />
    </ElementShell>
  );
}

function ImageGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 100 100'
      preserveAspectRatio='none'
      className={cn('text-foreground/25 size-4', className)}
    >
      <rect
        x='1'
        y='1'
        width='98'
        height='98'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        vectorEffect='non-scaling-stroke'
      />
      <path
        d='M1 1L99 99M99 1L1 99'
        stroke='currentColor'
        strokeWidth='1'
        vectorEffect='non-scaling-stroke'
      />
    </svg>
  );
}

const ASPECT_CLASSES: Record<ImageAspectRatio, string> = {
  square: 'aspect-square',
  landscape: 'aspect-video',
  portrait: 'aspect-[3/4]',
  wide: 'aspect-[21/9]'
};

function ImageCarousel({ node }: { node: UiNode }) {
  const carousel = node.properties?.imageDisplayMode === 'carousel';
  const count = carousel ? Math.min(node.properties?.imageCount ?? 3, 5) : 1;
  const aspect = ASPECT_CLASSES[node.properties?.imageAspectRatio ?? 'landscape'];
  const caption = node.properties?.showCaption;

  return (
    <ElementShell node={node} className='flex w-full flex-col items-center gap-1'>
      <div className='flex w-full items-start justify-center gap-1.5'>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className='flex min-w-0 flex-1 flex-col items-center gap-0.5'>
            <ImageGlyph className={cn('h-auto w-full', aspect)} />
            {caption ? (
              <span className='border-foreground/25 h-1.5 w-2/3 border-b border-dashed' />
            ) : null}
          </div>
        ))}
      </div>
      <span className='flex items-baseline gap-1.5 text-xs'>
        <span className='font-medium'>{node.label}</span>
        <span className='text-muted-foreground font-serif'>
          {carousel
            ? `(I₁, …, I${node.properties?.imageCount ? subscript(node.properties.imageCount) : 'ₙ'})`
            : 'I'}
        </span>
        <DependencyBadge node={node} />
      </span>
      {carousel && node.properties?.showIndicators ? (
        <span className='text-muted-foreground font-serif text-[10px] tracking-widest'>
          •{'∘'.repeat(Math.max(0, count - 1))}
        </span>
      ) : null}
    </ElementShell>
  );
}

interface ScreenFrameProps {
  title: string;
  screen: InterfaceScreen;
  header?: ReactNode;
  /** Only the selected layer's body scrolls; the rest clip at the fixed screen height. */
  scrollable: boolean;
  /** Shows the crop handle on the bottom edge; called once with the height a drag settles on. */
  onResize?: (height: number) => void;
}

/** The page mockup: a phone or desktop window, or a bottom panel sheet. */
export function ScreenFrame({ title, screen, header, scrollable, onResize }: ScreenFrameProps) {
  const { editable, select, hoveredId, selectedId } = useWireframe();
  const { dropProps, indicator } = useScreenDrop();
  const scrollRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const { layerRef, layer } = useFixedLayer(scrollRef, screen.nodes);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const phone = screen.device === 'phone';
  const panel = screen.pageStyle === 'panel';
  const frameStyle = {
    height: dragHeight ?? screen.height ?? SCREEN_SIZES[screen.device].height
  };

  useEffect(() => {
    const scroller = scrollRef.current;
    const target = selectedId
      ? scroller?.querySelector<HTMLElement>(`[data-node-id="${selectedId}"]`)
      : null;
    if (!scroller || !target) return;
    // The flow canvas is CSS-scaled, so client rects are in zoomed pixels.
    const box = scroller.getBoundingClientRect();
    const scale = box.height / scroller.offsetHeight || 1;
    const rect = target.getBoundingClientRect();
    const top = (rect.top - box.top) / scale;
    const bottom = (rect.bottom - box.top) / scale;
    if (top < 0) scroller.scrollTop += top - 12;
    else if (bottom > scroller.clientHeight) {
      scroller.scrollTop += Math.min(top - 12, bottom - scroller.clientHeight + 12);
    }
  }, [selectedId]);

  const content = (
    <div className='relative flex min-h-0 flex-1 flex-col'>
      <div
        ref={scrollRef}
        data-screen-scroll={scrollable ? '' : undefined}
        className={cn(
          'bg-card text-card-foreground min-h-0 flex-1 p-3',
          scrollable ? 'nowheel overflow-y-auto overscroll-contain' : 'overflow-hidden',
          hoveredId === ROOT_DROP_ID && 'ring-primary/60 bg-primary/5 ring-2 ring-inset'
        )}
        {...(editable ? { onClick: () => select(null) } : {})}
        {...dropProps}
      >
        {screen.nodes.length ? (
          <PageNodesContext value={screen.nodes}>
            <FixedLayerContext value={layer}>
              <WireframeChildren
                parentId={null}
                nodes={screen.nodes}
                flow={ROOT_FLOW}
                className='min-h-full'
              />
            </FixedLayerContext>
          </PageNodesContext>
        ) : (
          <div
            {...flowBoxAttributes(ROOT_FLOW)}
            data-flow-parent={ROOT_DROP_ID}
            className='text-muted-foreground flex h-40 items-center justify-center rounded-lg border-2 border-dashed text-xs'
          >
            {editable ? 'Drag elements here from the Library' : 'Empty screen'}
          </div>
        )}
      </div>
      {/* Pinned against the whole screen, so dragging a fixed element re-pins it there. */}
      <div
        ref={layerRef}
        {...flowBoxAttributes(ROOT_FLOW)}
        className='pointer-events-none absolute inset-0 overflow-hidden *:pointer-events-auto'
      />
      {indicator}
    </div>
  );

  let frame: ReactNode;
  if (panel) {
    frame = (
      <div
        style={frameStyle}
        className='bg-card flex flex-col overflow-hidden rounded-xl border shadow-lg'
      >
        <div className='bg-muted/60 flex shrink-0 flex-col items-center border-b p-2.5'>
          <span className='bg-muted-foreground/40 mb-2 h-1 w-10 rounded-full' />
          <span className='text-muted-foreground text-[11px] font-medium'>Panel sheet</span>
        </div>
        {content}
      </div>
    );
  } else if (phone) {
    frame = (
      <div
        style={frameStyle}
        className='flex flex-col overflow-hidden rounded-[30px] border-[7px] border-zinc-800 shadow-xl dark:border-zinc-700'
      >
        <div className='flex h-6 shrink-0 items-center justify-between bg-zinc-800 px-5 text-[10px] text-white dark:bg-zinc-700'>
          <span>9:41</span>
          <span className='flex items-center gap-1'>
            <Icons.broadcast className='size-3' />
            <Icons.world className='size-3' />
          </span>
        </div>
        {content}
        <div className='flex h-6 shrink-0 items-center justify-center bg-zinc-800 dark:bg-zinc-700'>
          <span className='h-1 w-1/3 rounded-full bg-white' />
        </div>
      </div>
    );
  } else {
    frame = (
      <div style={frameStyle} className='flex flex-col overflow-hidden rounded-xl border shadow-md'>
        <div className='bg-muted flex h-7 shrink-0 items-center justify-between border-b px-3'>
          <span className='text-muted-foreground truncate text-[11px] font-medium'>{title}</span>
          <span className='flex gap-1'>
            <span className='size-2.5 rounded-full bg-yellow-400' />
            <span className='size-2.5 rounded-full bg-green-400' />
            <span className='size-2.5 rounded-full bg-red-400' />
          </span>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-2'>
      {header}
      <div ref={frameRef} className='relative'>
        {frame}
        {onResize ? (
          <CropHandle
            frameRef={frameRef}
            height={frameStyle.height}
            onDrag={setDragHeight}
            onCommit={(height) => {
              setDragHeight(null);
              if (height !== frameStyle.height) onResize(height);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

interface CropHandleProps {
  frameRef: RefObject<HTMLDivElement | null>;
  height: number;
  onDrag: (height: number) => void;
  onCommit: (height: number) => void;
}

const clampHeight = (height: number) =>
  Math.round(Math.min(SCREEN_HEIGHT_RANGE.max, Math.max(SCREEN_HEIGHT_RANGE.min, height)));

/** Crop marks on the bottom edge; dragging them down extends the mockup's viewport. */
function CropHandle({ frameRef, height, onDrag, onCommit }: CropHandleProps) {
  const drag = useRef<{ id: number; startY: number; startHeight: number; scale: number } | null>(
    null
  );
  const next = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current!;
    return clampHeight(state.startHeight + (event.clientY - state.startY) / state.scale);
  };

  return (
    <div
      role='separator'
      aria-orientation='horizontal'
      aria-label='Resize screen height'
      title='Drag to resize'
      className='group nodrag nopan absolute inset-x-0 -bottom-3 flex h-6 cursor-ns-resize touch-none items-center justify-center'
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        const frame = frameRef.current;
        // The flow canvas is CSS-scaled, so pointer deltas are in zoomed pixels.
        const scale = frame ? frame.getBoundingClientRect().height / frame.offsetHeight || 1 : 1;
        drag.current = { id: event.pointerId, startY: event.clientY, startHeight: height, scale };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (drag.current?.id === event.pointerId) onDrag(next(event));
      }}
      onPointerUp={(event) => {
        if (drag.current?.id !== event.pointerId) return;
        onCommit(next(event));
        drag.current = null;
      }}
      onPointerCancel={() => {
        if (!drag.current) return;
        onCommit(drag.current.startHeight);
        drag.current = null;
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <span className='border-foreground/40 group-hover:border-primary absolute top-1/2 -left-2 size-4 -translate-y-full border-b-2 border-l-2 transition-colors' />
      <span className='border-foreground/40 group-hover:border-primary absolute top-1/2 -right-2 size-4 -translate-y-full border-r-2 border-b-2 transition-colors' />
      <span className='bg-foreground/40 group-hover:bg-primary h-1 w-12 rounded-full transition-colors' />
    </div>
  );
}
