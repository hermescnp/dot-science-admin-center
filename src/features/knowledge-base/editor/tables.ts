import type { Node as PMNode, ResolvedPos } from '@tiptap/pm/model';
import type { Editor, JSONContent } from '@tiptap/react';

const KEY_VALUE_SEPARATOR = /[:：]/;
const KEY_VALUE_HEADERS = ['Field', 'Value'] as const;

interface KeyValueRow {
  key: string;
  value: string;
}

function parseKeyValueLine(line: string): KeyValueRow | null {
  const trimmed = line.trim();
  const match = trimmed.match(KEY_VALUE_SEPARATOR);
  if (!match || match.index === undefined || match.index <= 0) return null;

  const key = trimmed.slice(0, match.index).trim();
  return key ? { key, value: trimmed.slice(match.index + 1).trim() } : null;
}

function parseKeyValueLines(lines: string[]): KeyValueRow[] | null {
  if (lines.length === 0) return null;
  const rows: KeyValueRow[] = [];
  for (const line of lines) {
    const row = parseKeyValueLine(line);
    if (!row) return null;
    rows.push(row);
  }
  return rows;
}

function cell(text: string, header: boolean): JSONContent {
  return {
    type: header ? 'tableHeader' : 'tableCell',
    content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }]
  };
}

function keyValueTable(rows: KeyValueRow[]): JSONContent {
  return {
    type: 'table',
    content: [
      { type: 'tableRow', content: KEY_VALUE_HEADERS.map((header) => cell(header, true)) },
      ...rows.map((row) => ({
        type: 'tableRow',
        content: [cell(row.key, false), cell(row.value, false)]
      }))
    ]
  };
}

function topLevelList($pos: ResolvedPos): { node: PMNode; pos: number } | null {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (node.type.name !== 'bulletList' && node.type.name !== 'orderedList') continue;
    if ($pos.node(depth - 1).type.name !== 'doc') continue;
    return { node, pos: $pos.before(depth) };
  }
  return null;
}

/** Item texts of a flat list; null when any item nests another list. */
function flatListItemTexts(list: PMNode): string[] | null {
  const texts: string[] = [];
  for (let index = 0; index < list.childCount; index += 1) {
    const item = list.child(index);
    let nested = false;
    item.forEach((child) => {
      if (child.type.name === 'bulletList' || child.type.name === 'orderedList') nested = true;
    });
    if (nested) return null;
    texts.push(item.textContent);
  }
  return texts;
}

interface KeyValueRange {
  rows: KeyValueRow[];
  from: number;
  to: number;
}

function keyValueListAtSelection(editor: Editor): KeyValueRange | null {
  const { $from, $to } = editor.state.selection;
  const fromList = topLevelList($from);
  const toList = topLevelList($to);
  const list = fromList && toList && fromList.pos === toList.pos ? fromList : (fromList ?? toList);
  if (!list) return null;

  const lines = flatListItemTexts(list.node);
  const rows = lines && parseKeyValueLines(lines);
  return rows ? { rows, from: list.pos, to: list.pos + list.node.nodeSize } : null;
}

function isKeyValue(node: PMNode) {
  return node.type.name === 'paragraph' && parseKeyValueLine(node.textContent) !== null;
}

/** The run of consecutive top-level `Key: value` paragraphs around the cursor. */
function keyValueParagraphsAtSelection(editor: Editor): KeyValueRange | null {
  const { doc, selection } = editor.state;

  const index = selection.$from.index(0);
  if (!isKeyValue(doc.child(index))) return null;

  let start = index;
  let end = index;
  while (start > 0 && isKeyValue(doc.child(start - 1))) start -= 1;
  while (end < doc.childCount - 1 && isKeyValue(doc.child(end + 1))) end += 1;

  let from = 0;
  for (let i = 0; i < start; i += 1) from += doc.child(i).nodeSize;
  let to = from;
  const lines: string[] = [];
  for (let i = start; i <= end; i += 1) {
    to += doc.child(i).nodeSize;
    lines.push(doc.child(i).textContent);
  }

  const rows = parseKeyValueLines(lines);
  return rows ? { rows, from, to } : null;
}

/**
 * Turns a `Key: value` list (or run of paragraphs) at the cursor into a two-column
 * table; otherwise inserts an empty 3×3 table with a header row.
 */
export function insertTableFromToolbar(editor: Editor) {
  const range = keyValueListAtSelection(editor) ?? keyValueParagraphsAtSelection(editor);
  if (range) {
    editor
      .chain()
      .focus()
      .insertContentAt({ from: range.from, to: range.to }, keyValueTable(range.rows))
      .run();
    return;
  }
  editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
}

export function isCursorInTable(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const name = $from.node(depth).type.name;
    if (name === 'tableCell' || name === 'tableHeader') return true;
  }
  return false;
}

/** The DOM wrapper of the top-level table holding the cursor. */
export function tableElementAtSelection(editor: Editor): HTMLElement | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name !== 'table') continue;
    if ($from.node(depth - 1).type.name !== 'doc') continue;

    const dom = editor.view.nodeDOM($from.before(depth));
    if (!(dom instanceof HTMLElement)) return null;
    if (dom.matches('.tableWrapper')) return dom;
    return dom.closest<HTMLElement>('.tableWrapper') ?? dom.closest('table') ?? dom;
  }
  return null;
}

export type TableCommand =
  | 'addRowAfter'
  | 'deleteRow'
  | 'addColumnAfter'
  | 'deleteColumn'
  | 'deleteTable';

export function runTableCommand(editor: Editor, command: TableCommand): boolean {
  if (!isCursorInTable(editor)) return false;
  const commands = editor.chain().focus();
  switch (command) {
    case 'addRowAfter':
      return commands.addRowAfter().run();
    case 'deleteRow':
      return commands.deleteRow().run();
    case 'addColumnAfter':
      return commands.addColumnAfter().run();
    case 'deleteColumn':
      return commands.deleteColumn().run();
    case 'deleteTable':
      return commands.deleteTable().run();
  }
}
