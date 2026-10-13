import { Extension } from '@tiptap/core';
import type { ResolvedPos } from '@tiptap/pm/model';

function ruleBeforeTextblock($from: ResolvedPos): { from: number; to: number } | null {
  if (!$from.parent.isTextblock || $from.parentOffset !== 0) return null;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const index = $from.index(depth - 1);
    if (index === 0) continue;

    const previous = $from.node(depth - 1).child(index - 1);
    if (previous.type.name !== 'horizontalRule') break;

    const to = $from.before(depth);
    return { from: to - previous.nodeSize, to };
  }
  return null;
}

function ruleAfterTextblock($from: ResolvedPos): { from: number; to: number } | null {
  if (!$from.parent.isTextblock || $from.parentOffset !== $from.parent.content.size) return null;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const index = $from.index(depth - 1);
    const parent = $from.node(depth - 1);
    if (index >= parent.childCount - 1) continue;

    const next = parent.child(index + 1);
    if (next.type.name !== 'horizontalRule') break;

    const from = $from.after(depth);
    return { from, to: from + next.nodeSize };
  }
  return null;
}

/**
 * ProseMirror can't place a text cursor on a divider, so Backspace at the start of a
 * block (or Delete at its end) removes the neighbouring divider instead of doing nothing.
 */
export const horizontalRuleKeyboard = Extension.create({
  name: 'horizontalRuleKeyboard',

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        if (!selection.empty) return false;
        const range = ruleBeforeTextblock(selection.$from);
        return range ? editor.chain().focus().deleteRange(range).run() : false;
      },
      Delete: ({ editor }) => {
        const { selection } = editor.state;
        if (!selection.empty) return false;
        const range = ruleAfterTextblock(selection.$from);
        return range ? editor.chain().focus().deleteRange(range).run() : false;
      }
    };
  }
});
