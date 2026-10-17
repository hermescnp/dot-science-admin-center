'use client';

import { useId, type ReactNode } from 'react';
import { Icons } from '@/components/icons';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  NODE_TYPES,
  type ButtonType,
  type DesignLayer,
  type ImageAspectRatio,
  type ImageDisplayMode,
  type InputType,
  type LayoutAlign,
  type LayoutDirection,
  type LayoutGap,
  type LayoutJustify,
  type NodeLayout,
  type NodeProperties,
  type NodeType,
  type SearchBarStyle,
  type TextStyle,
  type UiNode,
  type ValueType
} from '../../api/types';
import { scrollPinOf } from '../../lib/fixed-layer';
import {
  CONTAINER_TYPES,
  findNode,
  findParentId,
  flattenNodes,
  isContainerVisible,
  layoutWidth,
  NODE_LABELS
} from '../../lib/node-tree';
import { NODE_ICONS } from './node-icons';
import {
  AnchorPicker,
  ChoiceRow,
  DraftInput,
  DraftTextarea,
  type ChoiceOption
} from './property-controls';

const PIN_HINTS = {
  'fixed-top': 'First on the page — pinned to the top of the screen.',
  'fixed-bottom': 'Last on the page — pinned to the bottom of the screen.',
  sticky: 'Sticks to the top while the page scrolls.'
} as const;

type Options<T extends string> = readonly ChoiceOption<T>[];

const ELEMENT_TYPES: Options<NodeType> = NODE_TYPES.map((type) => ({
  value: type,
  label: NODE_LABELS[type],
  icon: NODE_ICONS[type]
}));

const BUTTON_TYPES: Options<ButtonType> = [
  { value: 'primary', label: 'Primary', icon: Icons.rectangleFilled },
  { value: 'basic', label: 'Basic (secondary)', icon: Icons.rectangle },
  { value: 'tertiary', label: 'Tertiary', icon: Icons.letterCase },
  { value: 'link', label: 'Link', icon: Icons.link },
  { value: 'image', label: 'Image', icon: Icons.photo },
  { value: 'toggle', label: 'Toggle', icon: Icons.toggle },
  { value: 'floating-action', label: 'Floating action', icon: Icons.plusCircle }
];

const INPUT_TYPES: Options<InputType> = [
  { value: 'text', label: 'Text input', icon: Icons.cursorText },
  { value: 'password', label: 'Password', icon: Icons.lock },
  { value: 'number', label: 'Number', icon: Icons.number },
  { value: 'date', label: 'Date picker', icon: Icons.calendar },
  { value: 'time', label: 'Time picker', icon: Icons.clock },
  { value: 'select', label: 'Dropdown (select)', icon: Icons.selectInput },
  { value: 'checkbox', label: 'Checkbox', icon: Icons.checkbox },
  { value: 'radio', label: 'Radio buttons', icon: Icons.radio },
  { value: 'file', label: 'File upload', icon: Icons.upload },
  { value: 'slider', label: 'Slider', icon: Icons.adjustments }
];

const VALUE_TYPES: Options<ValueType> = [
  { value: 'item-id', label: 'Item ID', icon: Icons.hash },
  { value: 'item-description', label: 'Item description', icon: Icons.textAlignLeft },
  { value: 'amount', label: 'Amount', icon: Icons.currency },
  { value: 'state', label: 'State', icon: Icons.status },
  { value: 'date', label: 'Date', icon: Icons.calendar },
  { value: 'quantity', label: 'Quantity', icon: Icons.sum }
];

const SEARCH_STYLES: Options<SearchBarStyle> = [
  { value: 'simple', label: 'Simple', icon: Icons.search },
  { value: 'with-filter', label: 'With filters', icon: Icons.filter },
  { value: 'with-voice', label: 'With voice search', icon: Icons.microphone }
];

const TEXT_STYLES: Options<TextStyle> = [
  { value: 'title', label: 'Title', icon: Icons.heading1, text: 'Title' },
  { value: 'body', label: 'Body', icon: Icons.textAlignLeft, text: 'Body' }
];

const DISPLAY_MODES: Options<ImageDisplayMode> = [
  { value: 'single', label: 'Single image', icon: Icons.photo, text: 'Single' },
  { value: 'carousel', label: 'Carousel', icon: Icons.carousel, text: 'Carousel' }
];

const ASPECT_RATIOS: Options<ImageAspectRatio> = [
  { value: 'square', label: 'Square', text: '1:1' },
  { value: 'landscape', label: 'Landscape', text: '16:9' },
  { value: 'portrait', label: 'Portrait', text: '3:4' },
  { value: 'wide', label: 'Wide', text: '21:9' }
];

const DEPENDENCIES: Options<'independent' | 'dependent'> = [
  { value: 'independent', label: 'Independent', icon: Icons.linkOff, text: 'Independent' },
  { value: 'dependent', label: 'Depends on another element', icon: Icons.link, text: 'Dependent' }
];

const OPTION_INPUTS: ReadonlySet<InputType | undefined> = new Set(['select', 'radio', 'checkbox']);

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='space-y-1.5'>
      <Label className='text-xs'>{label}</Label>
      {children}
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className='flex items-center justify-between gap-3'>
      <Label htmlFor={id} className='text-xs font-normal'>
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function CountSlider({
  label,
  value,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Row label={label}>
      <div className='flex items-center gap-3'>
        <Slider
          className='flex-1'
          value={[value]}
          min={min}
          max={max}
          step={1}
          onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : (next as number))}
        />
        <span className='w-6 text-right text-xs tabular-nums'>{value}</span>
      </div>
    </Row>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <div className='bg-muted/30 space-y-3 rounded-md border p-3'>{children}</div>;
}

const DIRECTIONS: Options<LayoutDirection> = [
  { value: 'column', label: 'Vertical (stack)', icon: Icons.arrowDown },
  { value: 'row', label: 'Horizontal (row)', icon: Icons.arrowRight }
];

/** Alignment across a flow: sideways in a stack, up and down in a row. */
function alignOptions(direction: LayoutDirection): Options<LayoutAlign> {
  return direction === 'column'
    ? [
        { value: 'stretch', label: 'Stretch', icon: Icons.arrowsHorizontal },
        { value: 'start', label: 'Left', icon: Icons.alignLeft },
        { value: 'center', label: 'Center', icon: Icons.alignCenter },
        { value: 'end', label: 'Right', icon: Icons.alignRight }
      ]
    : [
        { value: 'stretch', label: 'Stretch', icon: Icons.arrowsVertical },
        { value: 'start', label: 'Top', icon: Icons.alignTop },
        { value: 'center', label: 'Middle', icon: Icons.alignMiddle },
        { value: 'end', label: 'Bottom', icon: Icons.alignBottom }
      ];
}

/** Distribution along a flow: down a stack, across a row. */
function justifyOptions(direction: LayoutDirection): Options<LayoutJustify> {
  return direction === 'column'
    ? [
        { value: 'start', label: 'Top', icon: Icons.alignTop },
        { value: 'center', label: 'Middle', icon: Icons.alignMiddle },
        { value: 'end', label: 'Bottom', icon: Icons.alignBottom },
        { value: 'between', label: 'Space between', icon: Icons.distributeVertical }
      ]
    : [
        { value: 'start', label: 'Left', icon: Icons.alignLeft },
        { value: 'center', label: 'Center', icon: Icons.alignCenter },
        { value: 'end', label: 'Right', icon: Icons.alignRight },
        { value: 'between', label: 'Space between', icon: Icons.distributeHorizontal }
      ];
}

const GAPS: Options<LayoutGap> = [
  { value: 'none', label: 'No gap', text: '0' },
  { value: 'sm', label: 'Small', text: 'S' },
  { value: 'md', label: 'Medium', text: 'M' },
  { value: 'lg', label: 'Large', text: 'L' }
];

const WIDTH_MODES: Options<'fill' | 'hug' | 'percent'> = [
  { value: 'fill', label: 'Fill parent', icon: Icons.widthFill, text: 'Fill' },
  { value: 'hug', label: 'Hug content', icon: Icons.widthHug, text: 'Hug' },
  { value: 'percent', label: 'Share of parent', icon: Icons.percentage, text: 'Share' }
];

const WIDTH_PERCENTS = [20, 25, 33, 40, 50, 60, 66, 75, 80];

/** The direction of the flow `node` is placed in. */
function parentDirection(nodes: UiNode[], node: UiNode): LayoutDirection {
  if (node.type === 'column-layout') return 'row';
  const parentId = findParentId(nodes, node.id);
  const parent = parentId ? findNode(nodes, parentId) : null;
  const layout = parent?.properties?.layout;
  if (parent?.type === 'list' && parent.properties?.isDynamicList) {
    return layout?.itemDirection ?? 'column';
  }
  return parent?.type === 'tabs-bar' ? 'column' : (layout?.direction ?? 'column');
}

function LayoutGroup({
  node,
  nodes,
  onChange
}: {
  node: UiNode;
  nodes: UiNode[];
  onChange: (updates: Partial<NodeLayout>) => void;
}) {
  const layout = node.properties?.layout ?? {};
  const direction = layout.direction ?? 'column';
  const width = layoutWidth(node);
  const pin = scrollPinOf(node, nodes);
  const pinHint = pin ? PIN_HINTS[pin] : null;
  const percents =
    typeof width === 'number' && !WIDTH_PERCENTS.includes(width)
      ? [...WIDTH_PERCENTS, width].toSorted((a, b) => a - b)
      : WIDTH_PERCENTS;
  return (
    <Group>
      <Label className='text-xs'>Layout</Label>
      {CONTAINER_TYPES.has(node.type) ? (
        <>
          <div className='grid grid-cols-[auto_1fr] gap-3'>
            <ChoiceRow
              label='Flow'
              value={direction}
              options={DIRECTIONS}
              onChange={(next) => onChange({ direction: next })}
            />
            <ChoiceRow
              label='Gap'
              value={layout.gap ?? 'md'}
              options={GAPS}
              onChange={(gap) => onChange({ gap })}
            />
          </div>
          <ChoiceRow
            label='Distribute'
            value={layout.justify ?? 'start'}
            options={justifyOptions(direction)}
            onChange={(justify) => onChange({ justify })}
          />
          <ChoiceRow
            label='Align children'
            value={layout.align ?? 'stretch'}
            options={alignOptions(direction)}
            onChange={(align) => onChange({ align })}
          />
          <SwitchRow
            label='Wrap onto new lines'
            checked={layout.wrap ?? false}
            onChange={(wrap) => onChange({ wrap })}
          />
          {node.type === 'list' ? (
            <ChoiceRow
              label='Inside each item'
              value={layout.itemDirection ?? 'column'}
              options={DIRECTIONS}
              onChange={(itemDirection) => onChange({ itemDirection })}
            />
          ) : null}
          <Separator />
        </>
      ) : null}
      <ChoiceRow
        label='Width'
        value={typeof width === 'number' ? 'percent' : width}
        options={WIDTH_MODES}
        onChange={(mode) =>
          onChange({
            width: mode === 'percent' ? (typeof width === 'number' ? width : 50) : mode
          })
        }
      />
      {typeof width === 'number' ? (
        <NativeSelect
          className='w-full'
          aria-label='Share of parent width'
          value={String(width)}
          onChange={(event) => onChange({ width: Number(event.target.value) })}
        >
          {percents.map((percent) => (
            <NativeSelectOption key={percent} value={String(percent)}>
              {percent}% of parent
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : null}
      <ChoiceRow<LayoutAlign | 'parent'>
        label='Align self'
        value={layout.alignSelf ?? 'parent'}
        options={[
          { value: 'parent', label: 'As parent', icon: Icons.circleDashed },
          ...alignOptions(parentDirection(nodes, node))
        ]}
        onChange={(value) => onChange({ alignSelf: value === 'parent' ? undefined : value })}
      />
      <AnchorPicker
        value={layout.anchor}
        onChange={(anchor) => onChange({ anchor, ...(anchor ? { fixed: undefined } : {}) })}
      />
      <SwitchRow
        label='Fixed / sticky on scroll'
        checked={layout.fixed ?? false}
        onChange={(fixed) =>
          onChange({ fixed: fixed || undefined, ...(fixed ? { anchor: undefined } : {}) })
        }
      />
      {pinHint ? <p className='text-muted-foreground text-[11px] leading-snug'>{pinHint}</p> : null}
      <SwitchRow
        label='Grow to fill remaining space'
        checked={layout.grow ?? false}
        onChange={(grow) => onChange({ grow })}
      />
    </Group>
  );
}

interface NodeEditorProps {
  node: UiNode;
  /** The whole screen tree, to pick dependencies from. */
  nodes: UiNode[];
  /** Other screens a button can navigate to. */
  screens: DesignLayer[];
  onUpdate: (updates: Partial<UiNode>) => void;
}

export function NodeEditor({ node, nodes, screens, onUpdate }: NodeEditorProps) {
  const properties = node.properties ?? {};
  const setProperties = (updates: Partial<NodeProperties>) =>
    onUpdate({ properties: { ...properties, ...updates } });

  const ownTree = new Set(flattenNodes([node]).map((current) => current.id));
  const dependencyOptions = flattenNodes(nodes).filter((current) => !ownTree.has(current.id));
  const tabSections = node.children.filter((child) => child.type === 'section');

  return (
    <div className='space-y-4 p-3'>
      <ChoiceRow
        label='Element type'
        value={node.type}
        options={ELEMENT_TYPES}
        columns={6}
        onChange={(type) => onUpdate({ type })}
      />

      <Separator />

      <Row label='Label'>
        <DraftInput value={node.label} onValueChange={(label) => onUpdate({ label })} />
      </Row>

      {node.type !== 'text' && node.type !== 'data-display' ? (
        <Row label='Description'>
          <DraftTextarea
            value={node.description ?? ''}
            placeholder='Add a description…'
            className='min-h-16'
            onValueChange={(description) => onUpdate({ description })}
          />
        </Row>
      ) : null}

      {CONTAINER_TYPES.has(node.type) ? (
        <SwitchRow
          label='Visible container (shown in free design)'
          checked={isContainerVisible(node)}
          onChange={(visible) => setProperties({ visible })}
        />
      ) : null}

      {node.type === 'text' ? (
        <>
          <ChoiceRow
            label='Text style'
            value={properties.textStyle ?? 'body'}
            options={TEXT_STYLES}
            onChange={(textStyle) => setProperties({ textStyle })}
          />
          <Row label='Text content'>
            <DraftTextarea
              value={properties.content ?? ''}
              placeholder='Enter the text content…'
              className='min-h-20'
              onValueChange={(content) =>
                onUpdate({ description: content, properties: { ...properties, content } })
              }
            />
          </Row>
        </>
      ) : null}

      {node.type === 'button' ? (
        <>
          <ChoiceRow
            label='Button type'
            value={properties.buttonType ?? 'primary'}
            options={BUTTON_TYPES}
            onChange={(buttonType) => setProperties({ buttonType })}
          />
          <Row label='Behavior'>
            <DraftInput
              value={properties.behavior ?? ''}
              placeholder='What happens on click'
              onValueChange={(behavior) => setProperties({ behavior })}
            />
          </Row>
          <Row label='Travels to screen'>
            <NativeSelect
              className='w-full'
              value={properties.travelTo ?? ''}
              onChange={(event) => setProperties({ travelTo: event.target.value || undefined })}
            >
              <NativeSelectOption value=''>None</NativeSelectOption>
              {screens.map((layer) => (
                <NativeSelectOption key={layer.id} value={layer.id}>
                  {layer.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Row>
        </>
      ) : null}

      {node.type === 'field' ? (
        <>
          <ChoiceRow
            label='Input type'
            value={properties.inputType ?? 'text'}
            options={INPUT_TYPES}
            columns={5}
            onChange={(inputType) => setProperties({ inputType })}
          />
          <Row label='Validation rules'>
            <DraftTextarea
              value={properties.validation ?? ''}
              placeholder='Required, min/max length, format…'
              className='min-h-16'
              onValueChange={(validation) => setProperties({ validation })}
            />
          </Row>
          {OPTION_INPUTS.has(properties.inputType) ? (
            <Row label='Options (one per line)'>
              <DraftTextarea
                value={properties.options?.join('\n') ?? ''}
                placeholder='Enter options, one per line'
                className='min-h-20'
                onValueChange={(text) =>
                  setProperties({
                    options: text.split('\n').filter((line) => line.trim() !== '')
                  })
                }
              />
            </Row>
          ) : null}
        </>
      ) : null}

      {node.type === 'data-display' ? (
        <ChoiceRow
          label='Value type'
          value={properties.valueType ?? 'item-id'}
          options={VALUE_TYPES}
          onChange={(valueType) => setProperties({ valueType })}
        />
      ) : null}

      {node.type === 'list' ? (
        <Group>
          <SwitchRow
            label='Dynamic list (filled at runtime)'
            checked={properties.isDynamicList ?? false}
            onChange={(isDynamicList) => setProperties({ isDynamicList })}
          />
          {!properties.isDynamicList ? (
            <CountSlider
              label='Number of items'
              value={properties.itemCount ?? 3}
              min={1}
              max={10}
              onChange={(itemCount) => setProperties({ itemCount })}
            />
          ) : null}
          <SwitchRow
            label='Show “Load more” indicator'
            checked={properties.hasMoreIndicator ?? false}
            onChange={(hasMoreIndicator) => setProperties({ hasMoreIndicator })}
          />
        </Group>
      ) : null}

      {node.type === 'search-bar' ? (
        <Group>
          <ChoiceRow
            label='Search bar style'
            value={properties.searchBarStyle ?? 'simple'}
            options={SEARCH_STYLES}
            onChange={(searchBarStyle) => setProperties({ searchBarStyle })}
          />
          <Row label='Placeholder text'>
            <DraftInput
              value={properties.placeholder ?? ''}
              placeholder='Search…'
              onValueChange={(placeholder) => setProperties({ placeholder })}
            />
          </Row>
          <SwitchRow
            label='Show search button'
            checked={properties.hasSearchButton !== false}
            onChange={(hasSearchButton) => setProperties({ hasSearchButton })}
          />
        </Group>
      ) : null}

      {node.type === 'tabs-bar' ? (
        <Group>
          <p className='text-muted-foreground text-xs'>
            Each section added inside this element becomes a tab.
          </p>
          {tabSections.length > 0 ? (
            <Row label='Selected tab'>
              <NativeSelect
                className='w-full'
                value={String(properties.selectedTabIndex ?? 0)}
                onChange={(event) =>
                  setProperties({ selectedTabIndex: Number.parseInt(event.target.value, 10) })
                }
              >
                {tabSections.map((section, index) => (
                  <NativeSelectOption key={section.id} value={String(index)}>
                    {section.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Row>
          ) : null}
        </Group>
      ) : null}

      {node.type === 'image-carousel' ? (
        <Group>
          <ChoiceRow
            label='Display mode'
            value={properties.imageDisplayMode ?? 'single'}
            options={DISPLAY_MODES}
            onChange={(imageDisplayMode) => setProperties({ imageDisplayMode })}
          />
          <ChoiceRow
            label='Aspect ratio'
            value={properties.imageAspectRatio ?? 'landscape'}
            options={ASPECT_RATIOS}
            onChange={(imageAspectRatio) => setProperties({ imageAspectRatio })}
          />
          {properties.imageDisplayMode === 'carousel' ? (
            <CountSlider
              label='Number of images'
              value={properties.imageCount ?? 3}
              min={2}
              max={8}
              onChange={(imageCount) => setProperties({ imageCount })}
            />
          ) : null}
          <SwitchRow
            label='Show caption'
            checked={properties.showCaption ?? false}
            onChange={(showCaption) => setProperties({ showCaption })}
          />
          {properties.imageDisplayMode === 'carousel' ? (
            <SwitchRow
              label='Show indicators'
              checked={properties.showIndicators ?? false}
              onChange={(showIndicators) => setProperties({ showIndicators })}
            />
          ) : null}
        </Group>
      ) : null}

      <LayoutGroup
        node={node}
        nodes={nodes}
        onChange={(updates) => setProperties({ layout: { ...properties.layout, ...updates } })}
      />

      <Group>
        <ChoiceRow
          label='Dependency'
          value={properties.dependency ?? 'independent'}
          options={DEPENDENCIES}
          onChange={(dependency) =>
            setProperties({
              dependency,
              dependsOn: dependency === 'independent' ? undefined : properties.dependsOn
            })
          }
        />
        {properties.dependency === 'dependent' ? (
          <Row label='Depends on'>
            <NativeSelect
              className='w-full'
              value={
                properties.dependsOn && findNode(nodes, properties.dependsOn)
                  ? properties.dependsOn
                  : ''
              }
              onChange={(event) => setProperties({ dependsOn: event.target.value || undefined })}
            >
              <NativeSelectOption value=''>Select an element…</NativeSelectOption>
              {dependencyOptions.map((option) => (
                <NativeSelectOption key={option.id} value={option.id}>
                  {option.label} ({NODE_LABELS[option.type]})
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Row>
        ) : null}
      </Group>
    </div>
  );
}
