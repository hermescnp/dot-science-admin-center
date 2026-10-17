import { isBlockIdCommentHtml, stripBlockIdComments } from '@hermescnp/content-blocks';
import type { Editor, JSONContent } from '@tiptap/react';

const PM_SLICE_PATTERN = /data-pm-slice\s*=/i;
const EDITOR_CLASS_PATTERN = /layer-editor-(table|link|image)/i;
const RICH_STRUCTURE_PATTERN =
  /<(h[1-6]|table|thead|tbody|tr|td|th|ul|ol|li|blockquote|pre|code|img|strong|em|b|i|a)\b/i;

function normalizeLineEndings(text: string) {
  return text.replace(/\r\n?/g, '\n');
}

function htmlBody(html: string): string {
  const stripped = html
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
  return stripped.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1]?.trim() ?? stripped;
}

/**
 * Rich HTML (another editor, a web page) pastes best through ProseMirror so marks, tables
 * and images survive. Markdown parsing is only for plain-text payloads, including plain
 * text that arrives wrapped in trivial HTML.
 */
function shouldUseDefaultPaste(clipboard: DataTransfer): boolean {
  const html = clipboard.getData('text/html');
  if (!html?.trim()) return false;
  if (PM_SLICE_PATTERN.test(html) || EDITOR_CLASS_PATTERN.test(html)) return true;

  const body = htmlBody(html);
  if (!body || !RICH_STRUCTURE_PATTERN.test(body)) return false;

  const plain = normalizeLineEndings(clipboard.getData('text/plain') ?? '').trim();
  const bodyAsPlain = body
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return !(plain && bodyAsPlain === plain);
}

function plainTextToParagraphs(text: string): JSONContent[] {
  const trimmed = text.trim();
  if (!trimmed) return [{ type: 'paragraph' }];

  return trimmed.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    const content: JSONContent[] = [];
    lines.forEach((line, index) => {
      if (line) content.push({ type: 'text', text: line });
      if (index < lines.length - 1) content.push({ type: 'hardBreak' });
    });
    return { type: 'paragraph', content: content.length > 0 ? content : undefined };
  });
}

function textOf(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? '';
  return node.content?.map(textOf).join('') ?? '';
}

/** Nodes the schema rejects are kept as plain paragraphs rather than dropped. */
function sanitize(editor: Editor, nodes: JSONContent[]): JSONContent[] {
  return nodes.flatMap((node) => {
    if (!node?.type) return [];
    try {
      editor.schema.nodeFromJSON(node);
      return [node];
    } catch {
      const text = textOf(node).trim();
      return text ? [{ type: 'paragraph', content: [{ type: 'text', text }] }] : [];
    }
  });
}

function parseMarkdownBlocks(editor: Editor, markdown: string): JSONContent[] {
  if (!editor.markdown) return plainTextToParagraphs(markdown);
  try {
    const doc = editor.markdown.parse(markdown);
    if (doc.content?.length) return doc.content;
  } catch {
    // Fall through to plain paragraphs.
  }
  return plainTextToParagraphs(markdown);
}

/**
 * Browsers paste HTML when it's available, which flattens Markdown syntax. Parsing the
 * plain-text payload as Markdown keeps headings, lists, links and tables.
 */
export function handleMarkdownPaste(event: ClipboardEvent, editor: Editor | null): boolean {
  if (!editor?.isEditable) return false;
  const clipboard = event.clipboardData;
  if (!clipboard) return false;
  if ([...clipboard.items].some((item) => item.kind === 'file')) return false;
  if (shouldUseDefaultPaste(clipboard)) return false;

  const plain = clipboard.getData('text/plain');
  if (!plain) return false;

  event.preventDefault();
  const normalized = normalizeLineEndings(plain);
  const text = isBlockIdCommentHtml(normalized) ? stripBlockIdComments(normalized) : normalized;
  const blocks = sanitize(editor, parseMarkdownBlocks(editor, text));
  const content = blocks.length > 0 ? blocks : plainTextToParagraphs(text);

  try {
    // Insert block nodes only: a nested `doc` throws a RangeError.
    editor.chain().focus().insertContent(content).run();
  } catch {
    editor.chain().focus().insertContent(plainTextToParagraphs(text)).run();
  }
  return true;
}
