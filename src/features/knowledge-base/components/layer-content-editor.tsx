'use client';

import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getLayerEditorExtensions, type MathKind } from '../editor/extensions';
import { handleMarkdownPaste } from '../editor/paste-markdown';
import { insertTableFromToolbar } from '../editor/tables';
import { LinkDialog, MathDialog } from './editor-dialogs';
import { ImagePickerDialog } from './image-picker-dialog';
import { TableBlockControls } from './table-block-controls';

type EditorDialog =
  | { type: 'image' }
  | { type: 'link'; href: string }
  | { type: 'math'; kind: MathKind; latex: string; pos: number | null };

interface LayerContentEditorProps {
  /** Initial Markdown; the editor owns the content after mount. */
  value: string;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}

export function LayerContentEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Start writing the layer…'
}: LayerContentEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [dialog, setDialog] = useState<EditorDialog | null>(null);

  const extensions = useMemo(
    () =>
      getLayerEditorExtensions({
        placeholder,
        onEditMath: (kind, latex, pos) => setDialog({ type: 'math', kind, latex, pos })
      }),
    [placeholder]
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      content: value,
      contentType: 'markdown',
      editorProps: {
        attributes: { class: 'layer-editor-body', spellcheck: 'true' },
        handlePaste: (_view, event) => handleMarkdownPaste(event, editorRef.current)
      },
      onCreate: ({ editor: created }) => {
        editorRef.current = created;
      },
      onDestroy: () => {
        editorRef.current = null;
      },
      onUpdate: ({ editor: current }) => onChange(current.getMarkdown()),
      onBlur: () => onBlur?.()
    },
    // `value` only seeds the editor; re-creating it on every keystroke would reset the cursor.
    [extensions]
  );

  function closeDialog() {
    setDialog(null);
  }

  function applyLink(href: string | null) {
    closeDialog();
    if (!editor) return;
    const chain = editor.chain().focus().extendMarkRange('link');
    if (href === null) {
      chain.unsetLink().run();
    } else if (editor.state.selection.empty && !editor.isActive('link')) {
      chain
        .insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] })
        .run();
    } else {
      chain.setLink({ href }).run();
    }
  }

  function applyMath(latex: string, kind: MathKind, pos: number | null) {
    closeDialog();
    if (!editor) return;
    const chain = editor.chain().focus();
    if (pos === null) {
      (kind === 'block'
        ? chain.insertBlockMath({ latex })
        : chain.insertInlineMath({ latex })
      ).run();
    } else if (kind === 'block') {
      chain.updateBlockMath({ latex, pos }).run();
    } else {
      chain.updateInlineMath({ latex, pos }).run();
    }
  }

  function removeMath(kind: MathKind, pos: number) {
    closeDialog();
    if (!editor) return;
    const chain = editor.chain().focus();
    (kind === 'block' ? chain.deleteBlockMath({ pos }) : chain.deleteInlineMath({ pos })).run();
  }

  return (
    <div
      ref={containerRef}
      className='layer-editor bg-background relative flex min-h-[28rem] flex-1 flex-col rounded-lg border'
    >
      {editor ? (
        <EditorToolbar
          editor={editor}
          onImage={() => setDialog({ type: 'image' })}
          onLink={() =>
            setDialog({ type: 'link', href: String(editor.getAttributes('link').href ?? '') })
          }
          onMath={() => setDialog({ type: 'math', kind: 'inline', latex: '', pos: null })}
        />
      ) : (
        <div className='h-11 border-b' />
      )}
      <EditorContent editor={editor} className='flex flex-1 flex-col' />
      {editor ? <TableBlockControls editor={editor} containerRef={containerRef} /> : null}

      <ImagePickerDialog
        open={dialog?.type === 'image'}
        onOpenChange={(open) => !open && closeDialog()}
        onSelect={(image) =>
          editor
            ?.chain()
            .focus()
            .setImage({ src: image.url, alt: image.alt, title: image.alt })
            .run()
        }
      />
      {dialog?.type === 'link' ? (
        <LinkDialog initialHref={dialog.href} onClose={closeDialog} onSubmit={applyLink} />
      ) : null}
      {dialog?.type === 'math' ? (
        <MathDialog
          initialLatex={dialog.latex}
          initialKind={dialog.kind}
          editing={dialog.pos !== null}
          onClose={closeDialog}
          onSubmit={(latex, kind) => applyMath(latex, kind, dialog.pos)}
          onRemove={dialog.pos === null ? undefined : () => removeMath(dialog.kind, dialog.pos!)}
        />
      ) : null}
    </div>
  );
}

interface ToolbarItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: ReactNode;
  run: (editor: Editor) => void;
}

const BLOCK_ITEMS: ToolbarItem[] = [
  {
    id: 'h1',
    label: 'Title',
    shortcut: '⌘⌥1',
    icon: <Icons.heading1 />,
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
  },
  {
    id: 'h2',
    label: 'Subtitle',
    shortcut: '⌘⌥2',
    icon: <Icons.heading2 />,
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
  },
  {
    id: 'h3',
    label: 'Heading',
    shortcut: '⌘⌥3',
    icon: <Icons.heading3 />,
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
  }
];

const MARK_ITEMS: ToolbarItem[] = [
  {
    id: 'bold',
    label: 'Bold',
    shortcut: '⌘B',
    icon: <Icons.bold />,
    run: (editor) => editor.chain().focus().toggleBold().run()
  },
  {
    id: 'italic',
    label: 'Italic',
    shortcut: '⌘I',
    icon: <Icons.italic />,
    run: (editor) => editor.chain().focus().toggleItalic().run()
  }
];

const STRUCTURE_ITEMS: ToolbarItem[] = [
  {
    id: 'bulletList',
    label: 'Bullet list',
    shortcut: '⌘⇧8',
    icon: <Icons.bulletList />,
    run: (editor) => editor.chain().focus().toggleBulletList().run()
  },
  {
    id: 'orderedList',
    label: 'Numbered list',
    shortcut: '⌘⇧7',
    icon: <Icons.orderedList />,
    run: (editor) => editor.chain().focus().toggleOrderedList().run()
  },
  {
    id: 'blockquote',
    label: 'Quote',
    shortcut: '⌘⇧B',
    icon: <Icons.quote />,
    run: (editor) => editor.chain().focus().toggleBlockquote().run()
  },
  {
    id: 'horizontalRule',
    label: 'Divider line',
    icon: <Icons.divider />,
    run: (editor) => editor.chain().focus().setHorizontalRule().run()
  },
  {
    id: 'table',
    label: 'Table (turns a “Key: value” list into one)',
    icon: <Icons.table />,
    run: insertTableFromToolbar
  }
];

function EditorToolbar({
  editor,
  onImage,
  onLink,
  onMath
}: {
  editor: Editor;
  onImage: () => void;
  onLink: () => void;
  onMath: () => void;
}) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      h1: current.isActive('heading', { level: 1 }),
      h2: current.isActive('heading', { level: 2 }),
      h3: current.isActive('heading', { level: 3 }),
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      bulletList: current.isActive('bulletList'),
      orderedList: current.isActive('orderedList'),
      blockquote: current.isActive('blockquote'),
      horizontalRule: false,
      table: current.isActive('table'),
      link: current.isActive('link'),
      math: current.isActive('inlineMath') || current.isActive('blockMath')
    })
  });

  const renderItem = (item: ToolbarItem) => (
    <ToolbarButton
      key={item.id}
      label={item.label}
      shortcut={item.shortcut}
      active={active[item.id as keyof typeof active]}
      onClick={() => item.run(editor)}
    >
      {item.icon}
    </ToolbarButton>
  );

  return (
    <TooltipProvider delay={300}>
      <div
        role='toolbar'
        aria-label='Formatting'
        className='bg-background/95 supports-backdrop-filter:bg-background/80 sticky -top-6 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b px-2 py-1.5 backdrop-blur'
      >
        {BLOCK_ITEMS.map(renderItem)}
        <ToolbarSeparator />
        {MARK_ITEMS.map(renderItem)}
        <ToolbarSeparator />
        {STRUCTURE_ITEMS.map(renderItem)}
        <ToolbarSeparator />
        <ToolbarButton label='Insert image' onClick={onImage}>
          <Icons.photoPlus />
        </ToolbarButton>
        <ToolbarButton label='Link' active={active.link} onClick={onLink}>
          <Icons.link />
        </ToolbarButton>
        <ToolbarButton label='Formula (LaTeX)' active={active.math} onClick={onMath}>
          <Icons.math />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  );
}

function ToolbarSeparator() {
  return <span className='bg-border mx-1 h-5 w-px' aria-hidden />;
}

const keepEditorSelection = (event: MouseEvent) => event.preventDefault();

function ToolbarButton({
  label,
  shortcut,
  active = false,
  onClick,
  children
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type='button'
            size='icon-sm'
            variant={active ? 'secondary' : 'ghost'}
            aria-label={label}
            aria-pressed={active}
            onMouseDown={keepEditorSelection}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side='bottom'>
        {label}
        {shortcut ? <span className='opacity-60'>{shortcut}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}
