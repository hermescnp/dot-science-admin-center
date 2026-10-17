import {
  createContext,
  use,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode
} from 'react';
import { cn } from '@/lib/utils';
import {
  SCREEN_SIZES,
  type ImageAspectRatio,
  type InputType,
  type InterfaceScreen,
  type UiNode,
  type ValueType
} from '../../api/types';
import {
  flowBoxAttributes,
  flowItemAttributes,
  flowOf,
  flowStyle,
  GAPS,
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
import { isContainerVisible } from '../../lib/node-tree';
import { ComponentsByIdContext } from '../../lib/use-components';
import { useAnchorClearance } from '../../lib/use-anchor-clearance';
import {
  ComponentPreviewFrame,
  ComponentPreviewSkeleton,
  EditablePreviewFrame
} from './component-preview-frame';
import { ROOT_DROP_ID } from './wireframe-context';

/** Excalidraw registers its hand-drawn faces on the page, so the sketch matches the drawings. */
const SKETCH_FONT: CSSProperties = {
  fontFamily: 'Excalifont, Virgil, "Architects Daughter", "Comic Sans MS", cursive'
};

const STROKE = 'border-foreground/60 rounded-md border';
const FAINT_STROKE = 'border-foreground/25 rounded-md border';
/** Translucent, so each nesting level reads a shade lighter than its parent. */
const CONTAINER = cn(FAINT_STROKE, 'bg-foreground/[0.05]');
/** The container shade made opaque, so content scrolling under a fixed element doesn't show. */
const FIXED_CONTAINER = 'bg-[color-mix(in_oklab,var(--foreground)_5%,var(--background))]';

interface BoxProps {
  className?: string;
  faint?: boolean;
  dashed?: boolean;
  children?: ReactNode;
}

function Box({ className, faint, dashed, children }: BoxProps) {
  return (
    <div className={cn(faint ? FAINT_STROKE : STROKE, dashed && 'border-dashed', className)}>
      {children}
    </div>
  );
}

function CrossedBox({ className }: { className?: string }) {
  return (
    <Box faint className={cn('relative overflow-hidden', className)}>
      <svg
        viewBox='0 0 100 100'
        preserveAspectRatio='none'
        className='text-foreground/30 absolute inset-0 size-full'
      >
        <path
          d='M0 0 L100 100 M100 0 L0 100'
          fill='none'
          stroke='currentColor'
          strokeWidth='1'
          vectorEffect='non-scaling-stroke'
        />
      </svg>
    </Box>
  );
}

/**
 * Zooms every `[data-fit]` box in `root` out just enough that its content fits its width, so wide
 * rows shrink proportionally instead of spilling past their container. Boxes are fitted innermost
 * first, so a container only shrinks for overflow its children couldn't absorb. Zoom (unlike a
 * transform) also shrinks the box's height, so the layout around it closes up.
 */
function fitContent(root: HTMLElement) {
  const boxes = [root, ...root.querySelectorAll<HTMLElement>('[data-fit]')];
  for (const box of boxes) box.style.zoom = '';
  for (const box of boxes.toReversed()) {
    if (fits(box)) continue;
    box.style.zoom = String(MIN_FIT_ZOOM);
    if (!fits(box)) {
      // The overflow is all relative and grows with the box, so zooming can't help.
      box.style.zoom = '';
      continue;
    }
    zoomWhile(box, MIN_FIT_ZOOM, () => fits(box));
  }
  // A box fitted before an ancestor shrank too now has more room than it was fitted for. Growing
  // it back can squeeze its parent, children and row siblings, so every box must still fit.
  for (const box of boxes) {
    const zoom = Number(box.style.zoom);
    const shrunkNested = boxes.some(
      (other) => other !== box && other.style.zoom && (other.contains(box) || box.contains(other))
    );
    if (zoom && shrunkNested) zoomWhile(box, zoom, () => boxes.every(fits));
  }
}

const MIN_FIT_ZOOM = 0.05;

function fits(box: HTMLElement) {
  return box.scrollWidth <= box.clientWidth + 1;
}

/**
 * Sets `box` to the largest zoom up to 1 at which `ok` holds, given that it holds at `low`.
 * Content mixes fixed and relative widths, so the zoom isn't a simple ratio and is searched for.
 */
function zoomWhile(box: HTMLElement, low: number, ok: () => boolean) {
  box.style.zoom = '';
  if (ok()) return;
  let high = 1;
  for (let step = 0; step < 6; step++) {
    const mid = (low + high) / 2;
    box.style.zoom = String(mid);
    if (ok()) low = mid;
    else high = mid;
  }
  // Leave a margin, since subpixel rounding elsewhere can tip a zoom right at the edge back over.
  box.style.zoom = String(low * 0.99);
  if (!ok()) box.style.zoom = String(low);
}

/** The element whose properties are open, ringed like a selection in the layout view. */
const SketchSelectionContext = createContext<string | null>(null);

/** The component instance whose preview layout is being edited in place. */
const PreviewEditContext = createContext<string | null>(null);

const SELECTED = 'ring-primary rounded-sm ring-2 ring-offset-2 ring-offset-transparent';

function Placed({ node, flow, boxed }: { node: UiNode; flow: Flow; boxed?: boolean }) {
  const selected = use(SketchSelectionContext) === node.id;
  const editing = use(PreviewEditContext) === node.id;
  const pageNodes = use(PageNodesContext);
  const byId = use(ComponentsByIdContext);
  const pin = scrollPinOf(node, pageNodes);
  const pinned = isScreenFixed(pin) || pin === 'sticky';
  const componentId = node.properties?.componentId;
  const component = componentId ? byId.get(componentId) : undefined;
  const previewHtml = component?.previewStatus === 'ready' ? component.previewHtml : null;
  const generating = component?.previewStatus === 'pending';
  return (
    <FixedPortal node={node}>
      <div
        data-node-id={node.id}
        {...flowItemAttributes(node)}
        style={placementStyle(node, flow, pin)}
        className={cn(
          boxed && cn(CONTAINER, 'p-2.5'),
          pinned && (boxed ? FIXED_CONTAINER : 'bg-background rounded-md'),
          selected && SELECTED
        )}
      >
        {generating ? (
          <ComponentPreviewSkeleton previousHtml={component?.previewHtml ?? null} />
        ) : previewHtml && editing ? (
          <EditablePreviewFrame html={previewHtml} instanceId={node.id} />
        ) : previewHtml ? (
          <ComponentPreviewFrame html={previewHtml} />
        ) : (
          <SketchNode node={node} />
        )}
      </div>
    </FixedPortal>
  );
}

interface FlowChildrenProps {
  nodes: UiNode[];
  flow: Flow;
  /**
   * The node whose children these are (null for the page), when their box takes drops. Repeated
   * boxes, like a dynamic list's items, leave it out.
   */
  parentId?: string | null;
}

/** Children in order; consecutive column layouts share one row, side by side. */
function FlowChildren({ nodes, flow, parentId }: FlowChildrenProps) {
  const items: ReactNode[] = [];
  for (let index = 0; index < nodes.length; ) {
    const columns: UiNode[] = [];
    while (nodes[index]?.type === 'column-layout') columns.push(nodes[index++]);
    if (columns.length) {
      items.push(<ColumnRow key={columns[0].id} columns={columns} parentId={parentId} />);
    } else {
      items.push(<Placed key={nodes[index].id} node={nodes[index]} flow={flow} />);
      index++;
    }
  }
  return items;
}

const COLUMN_FLOW: Flow = { direction: 'row', align: 'stretch' };

function ColumnRow({ columns, parentId }: { columns: UiNode[]; parentId?: string | null }) {
  const selectedId = use(SketchSelectionContext);
  const grow = columns.some((column) => column.properties?.layout?.grow);
  return (
    <div
      {...flowItemAttributes(columns[0], columns[columns.length - 1])}
      {...(parentId === undefined
        ? null
        : { ...flowBoxAttributes(COLUMN_FLOW), 'data-flow-parent': parentId ?? ROOT_DROP_ID })}
      style={{ flex: grow ? '1 1 0' : undefined, gap: GAPS.md }}
      className='flex min-w-0 items-stretch self-stretch'
    >
      {columns.map((column) => (
        <div
          key={column.id}
          data-node-id={column.id}
          {...flowItemAttributes(column)}
          style={placementStyle(column, COLUMN_FLOW)}
          className={cn(selectedId === column.id && SELECTED)}
        >
          <Container node={column} />
        </div>
      ))}
    </div>
  );
}

/** A container's flow box, outlined when the grouping is visible in the real UI. */
function Container({ node }: { node: UiNode }) {
  const layout = node.properties?.layout;
  const flow = flowOf(layout);
  const boxRef = useRef<HTMLDivElement>(null);
  useAnchorClearance(boxRef, node.children);
  return (
    <div
      ref={boxRef}
      data-fit=''
      {...flowBoxAttributes(flow)}
      data-flow-parent={node.id}
      style={flowStyle(layout, flow)}
      className={cn('relative flex-1', isContainerVisible(node) && cn(CONTAINER, 'p-3'))}
    >
      {node.children.length ? (
        <FlowChildren nodes={node.children} flow={flow} parentId={node.id} />
      ) : (
        <p data-drop-inside={node.id} className='text-muted-foreground text-center text-sm'>
          {node.label}
        </p>
      )}
    </div>
  );
}

function SketchNode({ node }: { node: UiNode }) {
  switch (node.type) {
    case 'section':
    case 'form':
    case 'column-layout':
      return <Container node={node} />;
    case 'list':
      return <SketchList node={node} />;
    case 'tabs-bar':
      return <SketchTabs node={node} />;
    case 'button':
      return <SketchButton node={node} />;
    case 'field':
      return <SketchField node={node} />;
    case 'text':
      return <SketchText node={node} />;
    case 'data-display':
      return <SketchData node={node} />;
    case 'search-bar':
      return <SketchSearch node={node} />;
    case 'image-carousel':
      return <SketchImage node={node} />;
  }
}

/**
 * Dynamic lists repeat their item template; static lists already hold their items.
 * A visible list draws each item as a card or row.
 */
function SketchList({ node }: { node: UiNode }) {
  const layout = node.properties?.layout;
  const flow = flowOf(layout);
  const boxed = isContainerVisible(node);
  const staticRef = useRef<HTMLDivElement>(null);
  useAnchorClearance(staticRef, node.children);
  const more = node.properties?.hasMoreIndicator ? (
    <p className='text-muted-foreground text-center text-sm'>Load more…</p>
  ) : null;

  if (!node.properties?.isDynamicList && node.children.length) {
    return (
      <div
        ref={staticRef}
        data-fit=''
        style={flowStyle(layout, flow, 'sm')}
        className='relative flex-1'
      >
        {node.children.map((child) => (
          <Placed key={child.id} node={child} flow={flow} boxed={boxed} />
        ))}
        {more}
      </div>
    );
  }

  const itemFlow = flowOf(undefined, layout?.itemDirection);
  if (itemFlow.direction === 'row') itemFlow.align = 'center';
  const count = Math.min(node.properties?.itemCount ?? 3, flow.direction === 'row' ? 4 : 3);
  return (
    <div data-fit='' style={flowStyle(layout, flow, 'sm')} className='relative flex-1'>
      {Array.from({ length: count }, (_, index) => (
        <ListItem key={index} node={node} itemFlow={itemFlow} listFlow={flow} boxed={boxed} />
      ))}
      {more}
    </div>
  );
}

interface ListItemProps {
  node: UiNode;
  itemFlow: Flow;
  listFlow: Flow;
  boxed: boolean;
}

/** One repetition of a dynamic list's item template. */
function ListItem({ node, itemFlow, listFlow, boxed }: ListItemProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  useAnchorClearance(boxRef, node.children);
  return (
    <div
      ref={boxRef}
      data-fit=''
      style={{
        ...flowStyle(undefined, itemFlow, 'sm'),
        ...(listFlow.direction === 'row'
          ? { flex: '1 1 0', minWidth: node.properties?.layout?.wrap ? '30%' : 0 }
          : null)
      }}
      className={cn('relative', boxed && cn(CONTAINER, 'p-2.5'))}
    >
      {node.children.length ? (
        <FlowChildren nodes={node.children} flow={itemFlow} />
      ) : (
        <div className='bg-foreground/20 h-2 w-2/3 rounded-full' />
      )}
    </div>
  );
}

function SketchTabs({ node }: { node: UiNode }) {
  const tabs = node.children.filter((child) => child.type === 'section');
  const others = node.children.filter((child) => child.type !== 'section');
  const selectedIndex = Math.min(
    node.properties?.selectedTabIndex ?? 0,
    Math.max(0, tabs.length - 1)
  );
  const selected = tabs[selectedIndex];
  const layout = node.properties?.layout;
  const flow = flowOf(layout, 'column');
  return (
    <div
      data-fit=''
      style={flowStyle(layout, flow)}
      className={cn('relative flex-1', isContainerVisible(node) && cn(CONTAINER, 'p-3'))}
    >
      <div className='border-foreground/40 flex gap-1 self-stretch overflow-hidden border-b'>
        {tabs.map((tab, index) => (
          <span
            key={tab.id}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 pb-1 text-sm whitespace-nowrap',
              index === selectedIndex
                ? 'border-foreground'
                : 'text-muted-foreground border-transparent'
            )}
          >
            {tab.label}
          </span>
        ))}
      </div>
      {selected?.children.length ? <Placed node={selected} flow={flow} /> : null}
      <FlowChildren nodes={others} flow={flow} />
    </div>
  );
}

function SketchButton({ node }: { node: UiNode }) {
  const type = node.properties?.buttonType ?? 'primary';
  switch (type) {
    case 'image':
      return (
        <span className='border-foreground/60 flex size-10 items-center justify-center rounded-full border'>
          <CrossedBox className='size-4 rounded-sm' />
        </span>
      );
    case 'floating-action':
      return (
        <span className='border-foreground/70 bg-foreground/10 flex size-12 items-center justify-center rounded-full border text-2xl'>
          +
        </span>
      );
    case 'toggle':
      return (
        <div className='flex items-center justify-between gap-3 text-sm'>
          <span>{node.label}</span>
          <span className='border-foreground/70 relative h-5 w-9 shrink-0 rounded-full border'>
            <span className='bg-foreground/70 absolute top-1/2 right-0.5 size-3 -translate-y-1/2 rounded-full' />
          </span>
        </div>
      );
    case 'link':
      return <span className='text-sm underline underline-offset-4'>{node.label}</span>;
    case 'tertiary':
      return <span className='text-muted-foreground text-sm'>{node.label}</span>;
    default:
      return (
        <div
          className={cn(
            STROKE,
            'px-5 py-1.5 text-center text-sm whitespace-nowrap',
            type === 'primary' && 'bg-foreground/15'
          )}
        >
          {node.label}
        </div>
      );
  }
}

const FIELD_HINTS: Partial<Record<InputType, string>> = {
  password: '••••••••',
  number: '0',
  date: 'dd / mm / yyyy',
  time: 'hh : mm',
  file: 'Choose file…'
};

const FIELD_ADORNMENTS: Partial<Record<InputType, string>> = {
  select: '▾',
  date: '▦',
  time: '◷',
  file: '⇪'
};

function SketchField({ node }: { node: UiNode }) {
  const inputType = node.properties?.inputType ?? 'text';
  const options = node.properties?.options?.length
    ? node.properties.options
    : ['Option A', 'Option B'];

  if (inputType === 'checkbox') {
    return (
      <div className='flex items-center gap-2 text-sm'>
        <Box className='size-4 shrink-0' />
        {node.label}
      </div>
    );
  }

  let control: ReactNode;
  if (inputType === 'radio') {
    control = (
      <div className='flex flex-col gap-1.5'>
        {options.slice(0, 4).map((option, index) => (
          <span key={option} className='flex items-center gap-2 text-sm'>
            <span className='border-foreground/70 flex size-4 items-center justify-center rounded-full border'>
              {index === 0 ? <span className='bg-foreground/70 size-2 rounded-full' /> : null}
            </span>
            {option}
          </span>
        ))}
      </div>
    );
  } else if (inputType === 'slider') {
    control = (
      <div className='relative py-2'>
        <div className='bg-foreground/50 h-[1.5px] w-full' />
        <span className='border-foreground/70 bg-background absolute top-1/2 left-1/3 size-4 -translate-y-1/2 rounded-full border' />
      </div>
    );
  } else {
    const hint =
      FIELD_HINTS[inputType] ??
      (inputType === 'select' ? options[0] : node.properties?.placeholder || '');
    control = (
      <Box className='flex h-9 items-center justify-between px-3 text-sm'>
        <span className='text-muted-foreground truncate'>{hint}</span>
        {FIELD_ADORNMENTS[inputType] ? (
          <span className='text-muted-foreground'>{FIELD_ADORNMENTS[inputType]}</span>
        ) : null}
      </Box>
    );
  }

  return (
    <div className='flex min-w-40 flex-col gap-1 text-left'>
      <span className='text-sm'>{node.label}</span>
      {control}
    </div>
  );
}

function SketchText({ node }: { node: UiNode }) {
  const content = node.properties?.content || node.label;
  return node.properties?.textStyle === 'title' ? (
    <h3 className='text-xl leading-tight'>{content}</h3>
  ) : (
    <p className='text-muted-foreground text-sm leading-snug'>{content}</p>
  );
}

const VALUE_SAMPLES: Record<ValueType, string> = {
  'item-id': '#A-1024',
  'item-description': 'Short description…',
  amount: '$99.99',
  state: 'Active',
  date: 'Jan 15, 2026',
  quantity: '5'
};

function SketchData({ node }: { node: UiNode }) {
  const valueType = node.properties?.valueType ?? 'item-id';
  return (
    <div className='border-foreground/25 flex flex-wrap items-baseline justify-between gap-x-3 border-b border-dashed pb-1 text-sm'>
      <span className='text-muted-foreground'>{node.label}</span>
      <span>{VALUE_SAMPLES[valueType]}</span>
    </div>
  );
}

function SketchSearch({ node }: { node: UiNode }) {
  const style = node.properties?.searchBarStyle ?? 'simple';
  return (
    <div className='flex min-w-48 flex-col gap-2 text-left'>
      <div className='flex items-center gap-2'>
        <div className='border-foreground/70 flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border px-3 text-sm'>
          <span>⌕</span>
          <span className='text-muted-foreground min-w-0 flex-1 truncate'>
            {node.properties?.placeholder || 'Search…'}
          </span>
          {style === 'with-voice' ? <span className='text-muted-foreground'>🎙</span> : null}
        </div>
        {node.properties?.hasSearchButton ? (
          <div className={cn(STROKE, 'bg-foreground/15 px-3 py-1.5 text-sm')}>Go</div>
        ) : null}
      </div>
      {style === 'with-filter' ? (
        <div className='flex gap-1.5'>
          {['Filter', 'Filter', '+'].map((chip, index) => (
            <Box key={index} faint className='px-2.5 text-xs'>
              {chip}
            </Box>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const ASPECT_CLASSES: Record<ImageAspectRatio, string> = {
  square: 'aspect-square',
  landscape: 'aspect-video',
  portrait: 'aspect-[3/4]',
  wide: 'aspect-[21/9]'
};

function SketchImage({ node }: { node: UiNode }) {
  const carousel = node.properties?.imageDisplayMode === 'carousel';
  const aspect = ASPECT_CLASSES[node.properties?.imageAspectRatio ?? 'landscape'];
  const count = carousel ? Math.min(node.properties?.imageCount ?? 3, 5) : 1;
  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex gap-2 overflow-hidden'>
        <CrossedBox className={cn('shrink-0', carousel ? 'w-[85%]' : 'w-full', aspect)} />
        {carousel ? <CrossedBox className={cn('w-[85%] shrink-0', aspect)} /> : null}
      </div>
      {node.properties?.showCaption ? (
        <p className='text-muted-foreground text-center text-xs'>{node.label}</p>
      ) : null}
      {carousel && node.properties?.showIndicators ? (
        <div className='flex justify-center gap-1.5'>
          {Array.from({ length: count }, (_, index) => (
            <span
              key={index}
              className={cn(
                'border-foreground/70 size-2 rounded-full border',
                index === 0 && 'bg-foreground/70'
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface SketchScreenProps {
  title: string;
  screen: InterfaceScreen;
  header?: ReactNode;
  selectedId?: string | null;
  /** The component instance whose preview is drawn editable, for in-place layout editing. */
  editingPreviewId?: string | null;
  /** Content taller than the screen scrolls instead of being cut off. */
  scrollable?: boolean;
  /** Something is drawn over the screen, so an empty one shows no placeholder under it. */
  drawnOver?: boolean;
}

/** One element drawn on its own, at a screen-like width, for previews outside a screen. */
export function SketchPreview({
  node,
  width = 320,
  previewHtml
}: {
  node: UiNode;
  width?: number;
  previewHtml?: string | null;
}) {
  return (
    <div style={{ ...SKETCH_FONT, width }} className='text-foreground flex flex-col'>
      {previewHtml ? <ComponentPreviewFrame html={previewHtml} /> : <SketchNode node={node} />}
    </div>
  );
}

/** The screen drawn as a UX sketch: a device outline around a preview of each element. */
export function SketchScreen({
  title,
  screen,
  header,
  selectedId = null,
  editingPreviewId = null,
  scrollable = false,
  drawnOver = false
}: SketchScreenProps) {
  const phone = screen.device === 'phone';
  const panel = screen.pageStyle === 'panel';
  const height = screen.height ?? SCREEN_SIZES[screen.device].height;
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useAnchorClearance(contentRef, screen.nodes);
  const { layerRef, layer } = useFixedLayer(bodyRef, screen.nodes);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const fit = () => fitContent(body);
    if (document.fonts.status === 'loading') void document.fonts.ready.then(fit);
    // Fires once on observe, before the first paint.
    const observer = new ResizeObserver(fit);
    observer.observe(body);
    return () => observer.disconnect();
  }, [screen.nodes]);

  return (
    <div className='flex flex-col gap-2'>
      {header}
      <div
        data-screen-device=''
        style={{ ...SKETCH_FONT, height }}
        className={cn(
          'border-foreground/60 bg-background/70 text-foreground flex flex-col overflow-hidden rounded-xl border',
          phone && !panel && 'rounded-3xl'
        )}
      >
        {panel ? (
          <div className='border-foreground/40 flex shrink-0 justify-center border-b py-2'>
            <span className='bg-foreground/50 h-1 w-10 rounded-full' />
          </div>
        ) : phone ? (
          <div className='flex shrink-0 justify-center pt-2'>
            <span className='border-foreground/60 h-3 w-16 rounded-full border' />
          </div>
        ) : (
          <div className='border-foreground/40 flex shrink-0 items-center gap-1.5 border-b px-3 py-1.5'>
            {[0, 1, 2].map((dot) => (
              <span key={dot} className='border-foreground/60 size-2.5 rounded-full border' />
            ))}
            <span className='text-muted-foreground ml-2 truncate text-xs'>{title}</span>
          </div>
        )}
        <div className='relative flex min-h-0 flex-1 flex-col'>
          <div
            ref={bodyRef}
            data-sketch-body=''
            className={cn(
              'flex min-h-0 flex-1 flex-col p-4 contain-strict',
              scrollable ? 'overflow-x-hidden overflow-y-auto' : 'overflow-hidden'
            )}
          >
            {/* Pinned elements sit against the content, like in the layout view, not the viewport. */}
            <div
              ref={contentRef}
              {...flowBoxAttributes(ROOT_FLOW)}
              data-flow-parent={ROOT_DROP_ID}
              style={flowStyle(undefined, ROOT_FLOW)}
              className='relative min-h-full shrink-0'
            >
              {screen.nodes.length ? (
                <SketchSelectionContext value={selectedId}>
                  <PreviewEditContext value={editingPreviewId}>
                    <PageNodesContext value={screen.nodes}>
                      <FixedLayerContext value={layer}>
                        <FlowChildren nodes={screen.nodes} flow={ROOT_FLOW} parentId={null} />
                      </FixedLayerContext>
                    </PageNodesContext>
                  </PreviewEditContext>
                </SketchSelectionContext>
              ) : drawnOver ? null : (
                <p className='text-muted-foreground pt-10 text-center'>Empty screen</p>
              )}
            </div>
          </div>
          <div
            ref={layerRef}
            data-fixed-layer=''
            className='pointer-events-none absolute inset-0 overflow-hidden *:pointer-events-auto'
          />
        </div>
      </div>
    </div>
  );
}
