import {
  formatInteractiveGraphicFence,
  formatInteractiveGraphicInfo,
  interactiveGraphicFigureHtml,
  isInteractiveGraphicInfo,
  parseInteractiveGraphicInfo,
  type InteractiveGraphicLayout
} from '@hermescnp/content-blocks';
import type { Editor, JSONContent } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { NodeView } from '@tiptap/pm/view';

export interface InteractiveGraphicEdit {
  code: string;
  layout: InteractiveGraphicLayout;
  /** Position of the code block, or null when inserting a new graphic. */
  pos: number | null;
}

export function isInteractiveGraphicNode(node: ProseMirrorNode): boolean {
  return isInteractiveGraphicInfo(String(node.attrs.language ?? ''));
}

function layoutOf(node: ProseMirrorNode): InteractiveGraphicLayout {
  return parseInteractiveGraphicInfo(String(node.attrs.language ?? ''));
}

/** The default code-block serializer always writes a 3-backtick fence, which code with backticks would close early. */
export function interactiveGraphicMarkdown(node: JSONContent): string | null {
  const language = String(node.attrs?.language ?? '');
  if (!isInteractiveGraphicInfo(language)) return null;
  const code = (node.content ?? []).map((child) => child.text ?? '').join('');
  return formatInteractiveGraphicFence(code, parseInteractiveGraphicInfo(language));
}

/** Renders the sandboxed iframe with an Edit button; the code itself is never editable inline. */
export function createInteractiveGraphicNodeView(
  node: ProseMirrorNode,
  getPos: () => number | undefined,
  onEdit: (edit: InteractiveGraphicEdit) => void
): NodeView {
  let current = node;
  const dom = document.createElement('div');
  dom.className = 'layer-editor-interactive-graphic';
  dom.contentEditable = 'false';

  const preview = document.createElement('div');
  preview.innerHTML = interactiveGraphicFigureHtml(node.textContent, layoutOf(node));

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'layer-editor-interactive-graphic-edit';
  edit.textContent = 'Edit interactive graphic';
  edit.addEventListener('mousedown', (event) => event.preventDefault());
  edit.addEventListener('click', () => {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    onEdit({ code: current.textContent, layout: layoutOf(current), pos });
  });

  dom.append(preview, edit);

  return {
    dom,
    update: (next) => {
      if (next.type !== node.type || !isInteractiveGraphicNode(next)) return false;
      if (
        next.textContent !== current.textContent ||
        next.attrs.language !== current.attrs.language
      ) {
        preview.innerHTML = interactiveGraphicFigureHtml(next.textContent, layoutOf(next));
      }
      current = next;
      return true;
    },
    stopEvent: (event) => event.target === edit,
    ignoreMutation: () => true
  };
}

/** Inserts a new interactive-graphic code block, or replaces the one at `pos`. */
export function applyInteractiveGraphic(
  editor: Editor,
  code: string,
  layout: InteractiveGraphicLayout,
  pos: number | null
) {
  const language = formatInteractiveGraphicInfo(layout);
  const chain = editor.chain().focus();
  if (pos === null) {
    chain
      .insertContent({
        type: 'codeBlock',
        attrs: { language },
        content: [{ type: 'text', text: code }]
      })
      .run();
    return;
  }
  chain
    .command(({ tr, state }) => {
      const node = tr.doc.nodeAt(pos);
      if (!node || node.type.name !== 'codeBlock') return false;
      const replacement = node.type.create({ ...node.attrs, language }, state.schema.text(code));
      tr.replaceWith(pos, pos + node.nodeSize, replacement);
      return true;
    })
    .run();
}
