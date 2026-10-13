import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Mathematics } from '@tiptap/extension-mathematics';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import type { Extensions } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { horizontalRuleKeyboard } from './horizontal-rule-keyboard';

export type MathKind = 'inline' | 'block';

interface LayerEditorExtensionOptions {
  placeholder: string;
  /** Clicking a rendered formula asks to edit its LaTeX. */
  onEditMath: (kind: MathKind, latex: string, pos: number) => void;
}

export function getLayerEditorExtensions({
  placeholder,
  onEditMath
}: LayerEditorExtensionOptions): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false
    }),
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
    Image.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: { class: 'layer-editor-image' }
    }),
    Placeholder.configure({ placeholder, emptyEditorClass: 'is-editor-empty' })
  ];
}
