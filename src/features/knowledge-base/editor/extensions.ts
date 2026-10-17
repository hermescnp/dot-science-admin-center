import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Mathematics } from '@tiptap/extension-mathematics';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import { ReactNodeViewRenderer, type Extensions } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { blockIdExtension } from './block-ids';
import { horizontalRuleKeyboard } from './horizontal-rule-keyboard';
import type { InteractiveGraphicEdit } from './interactive-graphic';
import { LayerImageView } from './layer-image-view';
import { createGraphicCodeBlock, type VectorGraphicEdit } from './vector-graphic';

export type MathKind = 'inline' | 'block';

interface LayerEditorExtensionOptions {
  placeholder: string;
  /** Clicking a rendered formula asks to edit its LaTeX. */
  onEditMath: (kind: MathKind, latex: string, pos: number) => void;
  onEditVectorGraphic: (edit: VectorGraphicEdit) => void;
  onEditInteractiveGraphic: (edit: InteractiveGraphicEdit) => void;
}

export function getLayerEditorExtensions({
  placeholder,
  onEditMath,
  onEditVectorGraphic,
  onEditInteractiveGraphic
}: LayerEditorExtensionOptions): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false,
      codeBlock: false
    }),
    createGraphicCodeBlock({ onEditVectorGraphic, onEditInteractiveGraphic }),
    Mathematics.configure({
      katexOptions: { throwOnError: false, strict: false },
      inlineOptions: {
        onClick: (node, pos) => onEditMath('inline', String(node.attrs.latex ?? ''), pos)
      },
      blockOptions: {
        onClick: (node, pos) => onEditMath('block', String(node.attrs.latex ?? ''), pos)
      }
    }),
    TableKit.configure({
      table: { resizable: true, HTMLAttributes: { class: 'layer-editor-table' } }
    }),
    horizontalRuleKeyboard,
    Markdown.configure({ markedOptions: { gfm: true } }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'layer-editor-link' }
    }),
    Image.extend({
      addNodeView: () => ReactNodeViewRenderer(LayerImageView)
    }).configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: { class: 'layer-editor-image' }
    }),
    Placeholder.configure({ placeholder, emptyEditorClass: 'is-editor-empty' }),
    blockIdExtension
  ];
}
