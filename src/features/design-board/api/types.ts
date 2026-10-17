import { z } from 'zod';

export const NODE_TYPES = [
  'section',
  'button',
  'form',
  'field',
  'text',
  'data-display',
  'column-layout',
  'list',
  'search-bar',
  'tabs-bar',
  'image-carousel'
] as const;

export type NodeType = (typeof NODE_TYPES)[number];
export type PageStyle = 'screen' | 'panel';
export type ScreenDevice = 'phone' | 'desktop';
export type TextStyle = 'title' | 'body';
export type ButtonType =
  | 'primary'
  | 'basic'
  | 'tertiary'
  | 'image'
  | 'toggle'
  | 'floating-action'
  | 'link';
export type ValueType = 'item-id' | 'item-description' | 'amount' | 'state' | 'date' | 'quantity';
export type InputType =
  | 'text'
  | 'password'
  | 'number'
  | 'date'
  | 'time'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'file'
  | 'slider';
export type SearchBarStyle = 'simple' | 'with-filter' | 'with-voice';
export type ImageDisplayMode = 'single' | 'carousel';
export type ImageAspectRatio = 'square' | 'landscape' | 'portrait' | 'wide';

export type LayoutDirection = 'column' | 'row';
export type LayoutAlign = 'start' | 'center' | 'end' | 'stretch';
export type LayoutJustify = 'start' | 'center' | 'end' | 'between';
export type LayoutGap = 'none' | 'sm' | 'md' | 'lg';
export type LayoutAnchor =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';
/** `fill` takes the parent's width (or shares a row), `hug` fits the content, a number is a % of the parent. */
export type LayoutWidth = 'fill' | 'hug' | number;

/** Auto-layout placement, so previews can position elements like the real UI. */
export interface NodeLayout {
  /** Containers: how children flow (default column). */
  direction?: LayoutDirection;
  /** Containers: distribution along the flow (default start). */
  justify?: LayoutJustify;
  /** Containers: cross-axis alignment of children (default stretch). */
  align?: LayoutAlign;
  gap?: LayoutGap;
  wrap?: boolean;
  /** Lists: how the elements inside one item flow (default column). */
  itemDirection?: LayoutDirection;
  width?: LayoutWidth;
  /** Overrides the parent's `align` for this element. */
  alignSelf?: LayoutAlign;
  /** Takes the remaining space along the parent's flow (e.g. a main area under a header). */
  grow?: boolean;
  /** Pinned over the parent at this anchor instead of flowing (floating buttons, overlays). */
  anchor?: LayoutAnchor;
  /**
   * Stays put while the page scrolls: first root element pins to the top, last to the bottom,
   * anything else sticks to the top.
   */
  fixed?: boolean;
}

export interface NodeProperties {
  layout?: NodeLayout;
  behavior?: string;
  validation?: string;
  options?: string[];
  buttonType?: ButtonType;
  textStyle?: TextStyle;
  content?: string;
  dependency?: 'independent' | 'dependent';
  /** Id of the node this one depends on. */
  dependsOn?: string;
  valueType?: ValueType;
  inputType?: InputType;
  /** Id of the layer whose screen this button navigates to. */
  travelTo?: string;
  itemCount?: number;
  hasMoreIndicator?: boolean;
  isDynamicList?: boolean;
  /** Containers only: whether the grouping has a visible boundary in the real UI (default true). */
  visible?: boolean;
  searchBarStyle?: SearchBarStyle;
  placeholder?: string;
  hasSearchButton?: boolean;
  tabsCount?: number;
  tabLabels?: string[];
  selectedTabIndex?: number;
  imageDisplayMode?: ImageDisplayMode;
  imageCount?: number;
  imageAspectRatio?: ImageAspectRatio;
  showCaption?: boolean;
  showIndicators?: boolean;
  /** Marks a linked instance of this reusable component; its content comes from the component. */
  componentId?: string;
}

export interface UiNode {
  id: string;
  label: string;
  description?: string;
  type: NodeType;
  children: UiNode[];
  properties?: NodeProperties;
  expanded?: boolean;
}

/** One page mockup placed on the section canvas at scene coordinates `x`/`y`. */
export interface InterfaceScreen {
  device: ScreenDevice;
  pageStyle: PageStyle;
  x: number;
  y: number;
  /** Viewport height set by dragging the bottom edge; the device default when absent. */
  height?: number;
  nodes: UiNode[];
}

export interface DesignLayer {
  id: string;
  sectionId: string;
  title: string;
  position: number;
  /** Excalidraw elements owned by this layer. */
  elements: unknown[];
  screen: InterfaceScreen | null;
  updatedAt: string;
}

export interface DesignSection {
  id: string;
  title: string;
  position: number;
  /** Excalidraw binary files shared by every layer on the canvas. */
  files: Record<string, unknown>;
  layers: DesignLayer[];
  updatedAt: string;
}

export type PreviewStatus = 'pending' | 'ready' | 'error';

/** One internal piece of a reusable component, for docs and the details panel. */
export interface ComponentPart {
  id: string;
  label: string;
  summary: string;
}

/** A reusable element or group, shared by every section; screens place linked instances of it. */
export interface DesignComponent {
  id: string;
  name: string;
  node: UiNode;
  /** Unified description of the component as a unit; filled by the preview generator. */
  description: string | null;
  parts: ComponentPart[];
  /** Interactive HTML/CSS/JS sketch shown in free design and cards. */
  previewHtml: string | null;
  previewStatus: PreviewStatus;
  previewError: string | null;
  updatedAt: string;
}

/** Kept under Vercel's 4.5 MB request body limit; images are embedded in the scene. */
export const MAX_SCENE_BYTES = 4 * 1024 * 1024;

export const SCREEN_SIZES: Record<ScreenDevice, { width: number; height: number }> = {
  phone: { width: 320, height: 640 },
  desktop: { width: 960, height: 600 }
};

export const SCREEN_HEIGHT_RANGE = { min: 240, max: 4000 } as const;

export const uiNodeSchema: z.ZodType<UiNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1).max(64),
    label: z.string().max(200),
    description: z.string().max(1000).optional(),
    type: z.enum(NODE_TYPES),
    children: z.array(uiNodeSchema),
    properties: z.record(z.string(), z.unknown()).optional() as z.ZodType<
      NodeProperties | undefined
    >,
    expanded: z.boolean().optional()
  })
);

export const screenSchema = z.object({
  device: z.enum(['phone', 'desktop']),
  pageStyle: z.enum(['screen', 'panel']),
  x: z.number().finite(),
  y: z.number().finite(),
  height: z.number().int().min(SCREEN_HEIGHT_RANGE.min).max(SCREEN_HEIGHT_RANGE.max).optional(),
  nodes: z.array(uiNodeSchema)
});

export const sectionTitleSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(80, 'Keep it under 80 characters')
});

export const createLayerSchema = z.object({
  sectionId: z.string().uuid(),
  title: z.string().trim().min(1, 'Title is required').max(120, 'Keep it under 120 characters'),
  screen: screenSchema.optional()
});

export const updateLayerSchema = z
  .object({
    title: createLayerSchema.shape.title,
    screen: screenSchema.nullable()
  })
  .partial();

export const componentPartSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().max(200),
  summary: z.string().max(1000)
});

export const componentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  node: uiNodeSchema
});

export const updateComponentSchema = componentSchema
  .extend({
    description: z.string().trim().max(4000).nullable(),
    parts: z.array(componentPartSchema).max(200),
    previewHtml: z.string().max(500_000).nullable(),
    previewStatus: z.enum(['pending', 'ready', 'error']),
    previewError: z.string().max(2000).nullable()
  })
  .partial();

export const vibeEditSchema = z.object({
  prompt: z.string().trim().min(1, 'Describe the change').max(2000, 'Keep it under 2000 characters')
});

export const refinePreviewSchema = z.object({
  change: z.string().trim().max(3000).optional()
});

/** A vibe edit's saved component and the model's one-line account of what changed. */
export interface VibeEditResult {
  component: DesignComponent;
  summary: string;
}

/**
 * A frame's screenshot (PNG data URL), the user's direction for the AI render, the UI structure
 * of the mockup screens in it and the measured layout of its contents (absent when it's empty).
 */
export const frameRenderSchema = z
  .object({
    prompt: z.string().trim().max(2000, 'Keep it under 2000 characters'),
    screens: z.string().trim().max(16_000, 'The screens outline is too long').optional(),
    layout: z.string().trim().max(8000, 'The layout is too long').optional(),
    image: z
      .string()
      .startsWith('data:image/png;base64,', 'The screenshot must be a PNG')
      .max(12_000_000, 'The screenshot is too large'),
    width: z.number().positive(),
    height: z.number().positive()
  })
  .refine((payload) => payload.prompt || payload.layout || payload.screens, {
    message: 'Draw something in the frame or describe the render'
  });

export interface FrameRenderResult {
  /** The rendered image as a data URL. */
  dataUrl: string;
}

/** A description of the diagram to draw in the Diagram Flow dialog (Excalidraw's prompt limits). */
export const diagramFlowSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, 'Describe the diagram in a few words')
    .max(1000, 'Keep it under 1000 characters')
});

export interface DiagramFlowResult {
  /** A Mermaid flowchart, sequence or class diagram definition. */
  mermaid: string;
}

/**
 * A mockup screen with drawings over it: its current structure, a screenshot of the screen with
 * the drawings (PNG data URL), and where the drawings and the screen's elements sit on it.
 */
export const drawIntoLayoutSchema = z.object({
  device: screenSchema.shape.device,
  nodes: z.array(uiNodeSchema).max(500),
  image: z
    .string()
    .startsWith('data:image/png;base64,', 'The screenshot must be a PNG')
    .max(12_000_000, 'The screenshot is too large'),
  drawings: z.string().trim().max(8000, 'The drawings layout is too long'),
  elements: z.string().trim().max(16_000, 'The screen layout is too long')
});

/** The screen's structure with the drawings applied, and the model's account of the change. */
export interface DrawIntoLayoutResult {
  nodes: UiNode[];
  summary: string;
}

export const sceneSchema = z.object({
  layers: z.record(z.string().uuid(), z.array(z.unknown())),
  files: z.record(z.string(), z.unknown())
});

export type SectionTitlePayload = z.infer<typeof sectionTitleSchema>;
export type CreateLayerPayload = z.infer<typeof createLayerSchema>;
export type UpdateLayerPayload = z.infer<typeof updateLayerSchema>;
export type ScenePayload = z.infer<typeof sceneSchema>;
export type ComponentPayload = z.infer<typeof componentSchema>;
export type UpdateComponentPayload = z.infer<typeof updateComponentSchema>;
export type VibeEditPayload = z.infer<typeof vibeEditSchema>;
export type RefinePreviewPayload = z.infer<typeof refinePreviewSchema>;
export type FrameRenderPayload = z.infer<typeof frameRenderSchema>;
export type DiagramFlowPayload = z.infer<typeof diagramFlowSchema>;
export type DrawIntoLayoutPayload = z.infer<typeof drawIntoLayoutSchema>;
