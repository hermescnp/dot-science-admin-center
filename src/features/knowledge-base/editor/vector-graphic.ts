import {
  formatVectorGraphicInfo,
  isVectorGraphicInfo,
  parseVectorGraphicInfo,
  vectorGraphicFigureHtml,
  type VectorGraphicLayout
} from '@hermescnp/content-blocks';
import type { Editor } from '@tiptap/core';
import { CodeBlock } from '@tiptap/extension-code-block';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import {
  createInteractiveGraphicNodeView,
  interactiveGraphicMarkdown,
  isInteractiveGraphicNode,
  type InteractiveGraphicEdit
} from './interactive-graphic';

export interface VectorGraphicEdit {
  svg: string;
  layout: VectorGraphicLayout;
  /** Position of the code block, or null when inserting a new graphic. */
  pos: number | null;
}

interface GraphicCodeBlockOptions {
  onEditVectorGraphic: (edit: VectorGraphicEdit) => void;
  onEditInteractiveGraphic: (edit: InteractiveGraphicEdit) => void;
}

function isVectorGraphicNode(node: ProseMirrorNode): boolean {
  return isVectorGraphicInfo(String(node.attrs.language ?? ''));
}

function graphicHtml(node: ProseMirrorNode): string {
  return vectorGraphicFigureHtml(
    node.textContent,
    parseVectorGraphicInfo(String(node.attrs.language ?? ''))
  );
}

function renderDefaultCodeBlock(node: ProseMirrorNode, languageClassPrefix: string) {
  const dom = document.createElement('pre');
  const contentDOM = document.createElement('code');
  const language = node.attrs.language;
  if (language) contentDOM.className = `${languageClassPrefix}${language}`;
  dom.append(contentDOM);
  return { dom, contentDOM };
}

/**
 * Code blocks whose info string is `vector-graphic …` render as the sanitized SVG, and
 * `interactive-graphic …` as a sandboxed iframe, each with an Edit button; every other code
 * block keeps the plain `<pre><code>` view.
 */
export function createGraphicCodeBlock({
  onEditVectorGraphic,
  onEditInteractiveGraphic
}: GraphicCodeBlockOptions) {
  return CodeBlock.extend({
    renderMarkdown(node, helpers, context) {
      return interactiveGraphicMarkdown(node) ?? this.parent?.(node, helpers, context) ?? '';
    },
    addNodeView() {
      const languageClassPrefix = this.options.languageClassPrefix ?? 'language-';
      return ({ node, getPos }) => {
        if (isInteractiveGraphicNode(node)) {
          return createInteractiveGraphicNodeView(node, getPos, onEditInteractiveGraphic);
        }
        if (!isVectorGraphicNode(node)) {
          const view = renderDefaultCodeBlock(node, languageClassPrefix);
          return {
            ...view,
            update: (next) =>
              next.type === node.type &&
              !isVectorGraphicNode(next) &&
              !isInteractiveGraphicNode(next) &&
              next.attrs.language === node.attrs.language
          };
        }

        let current = node;
        const dom = document.createElement('div');
        dom.className = 'layer-editor-vector-graphic';
        dom.contentEditable = 'false';

        const preview = document.createElement('div');
        preview.innerHTML = graphicHtml(node);

        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'layer-editor-vector-graphic-edit';
        edit.textContent = 'Edit graphic';
        edit.addEventListener('mousedown', (event) => event.preventDefault());
        edit.addEventListener('click', () => {
          const pos = getPos();
          if (typeof pos !== 'number') return;
          onEditVectorGraphic({
            svg: current.textContent,
            layout: parseVectorGraphicInfo(String(current.attrs.language ?? '')),
            pos
          });
        });

        dom.append(preview, edit);

        return {
          dom,
          update: (next) => {
            if (next.type !== node.type || !isVectorGraphicNode(next)) return false;
            if (
              next.textContent !== current.textContent ||
              next.attrs.language !== current.attrs.language
            ) {
              preview.innerHTML = graphicHtml(next);
            }
            current = next;
            return true;
          },
          stopEvent: (event) => event.target === edit,
          ignoreMutation: () => true
        };
      };
    }
  });
}

/** Inserts a new vector-graphic code block, or replaces the one at `pos`. */
export function applyVectorGraphic(
  editor: Editor,
  svg: string,
  layout: VectorGraphicLayout,
  pos: number | null
) {
  const language = formatVectorGraphicInfo(layout);
  const chain = editor.chain().focus();
  if (pos === null) {
    chain
      .insertContent({
        type: 'codeBlock',
        attrs: { language },
        content: [{ type: 'text', text: svg }]
      })
      .run();
    return;
  }
  chain
    .command(({ tr, state }) => {
      const node = tr.doc.nodeAt(pos);
      if (!node || node.type.name !== 'codeBlock') return false;
      const replacement = node.type.create({ ...node.attrs, language }, state.schema.text(svg));
      tr.replaceWith(pos, pos + node.nodeSize, replacement);
      return true;
    })
    .run();
}

/** Removes the graphic code block (vector or interactive) at `pos`. */
export function removeVectorGraphic(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor
    .chain()
    .focus()
    .deleteRange({ from: pos, to: pos + node.nodeSize })
    .run();
}
