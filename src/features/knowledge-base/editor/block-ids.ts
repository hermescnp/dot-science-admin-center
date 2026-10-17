import { injectBlockIdComments, listMarkdownBlocks } from '@hermescnp/content-blocks';
import { createBlockIdExtension } from '@hermescnp/content-blocks/tiptap';
import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const blockIdExtension = createBlockIdExtension({ Extension, Plugin, PluginKey });

const SEED_META = 'blockIdSeed';

/** The markdown without its id comments, every block kept verbatim. */
export function markdownWithoutBlockIds(content: string): string {
  return listMarkdownBlocks(content)
    .map((block) => block.raw)
    .join('\n\n');
}

/**
 * Moves the stored ids from the markdown comments onto the editor's top-level nodes.
 * Returns false when the parsed document doesn't line up block-for-block with the
 * markdown; the editor then saves plain markdown and the server re-matches ids by content.
 */
export function seedBlockIds(editor: Editor, content: string): boolean {
  const ids = listMarkdownBlocks(content).map((block) => block.id);
  const { doc, tr } = editor.state;
  if (ids.length !== doc.childCount || ids.some((id) => id === null)) return false;

  doc.forEach((node, offset, index) => {
    if ('id' in node.attrs) tr.setNodeMarkup(offset, undefined, { ...node.attrs, id: ids[index] });
  });
  editor.view.dispatch(tr.setMeta(SEED_META, true).setMeta('addToHistory', false));
  return true;
}

export function isBlockIdSeed(transaction: { getMeta: (key: string) => unknown }): boolean {
  return transaction.getMeta(SEED_META) === true;
}

/** Editor markdown with each top-level block preceded by its id comment, when they align. */
export function markdownWithBlockIds(editor: Editor): string {
  const markdown = editor.getMarkdown();
  const ids: string[] = [];
  editor.state.doc.forEach((node) => {
    if (typeof node.attrs.id === 'string' && node.attrs.id) ids.push(node.attrs.id);
  });
  if (ids.length !== editor.state.doc.childCount) return markdown;
  if (listMarkdownBlocks(markdown).length !== ids.length) return markdown;
  return injectBlockIdComments(markdown, ids);
}
