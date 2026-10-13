'use client';

import type { Editor } from '@tiptap/react';
import { useEffect, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  isCursorInTable,
  runTableCommand,
  tableElementAtSelection,
  type TableCommand
} from '../editor/tables';

const CONTROLS_HEIGHT = 34;
const GAP = 6;
const EDGE_INSET = 4;

interface Position {
  top: number;
  right: number;
}

function controlsPosition(editor: Editor, container: HTMLElement): Position | null {
  if (editor.isDestroyed || !editor.isEditable || !editor.isFocused) return null;
  if (!isCursorInTable(editor)) return null;

  const table = tableElementAtSelection(editor);
  if (!table) return null;
  const tableRect = table.getBoundingClientRect();
  if (tableRect.width <= 0 || tableRect.height <= 0) return null;

  const containerRect = container.getBoundingClientRect();
  return {
    top: Math.max(EDGE_INSET, tableRect.top - containerRect.top - CONTROLS_HEIGHT - GAP),
    right: Math.max(EDGE_INSET, containerRect.right - tableRect.right)
  };
}

interface TableBlockControlsProps {
  editor: Editor;
  /** Positioned ancestor the controls are placed in. */
  containerRef: RefObject<HTMLElement | null>;
}

export function TableBlockControls({ editor, containerRef }: TableBlockControlsProps) {
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    const update = () => {
      const container = containerRef.current;
      const next = container ? controlsPosition(editor, container) : null;
      setPosition((current) =>
        current?.top === next?.top && current?.right === next?.right ? current : next
      );
    };

    editor.on('selectionUpdate', update);
    editor.on('update', update);
    editor.on('focus', update);
    editor.on('blur', update);
    window.addEventListener('resize', update);
    update();
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('update', update);
      editor.off('focus', update);
      editor.off('blur', update);
      window.removeEventListener('resize', update);
    };
  }, [containerRef, editor]);

  if (!position) return null;

  const run = (command: TableCommand) => {
    runTableCommand(editor, command);
    if (command === 'deleteTable') setPosition(null);
  };

  return (
    <div
      className='bg-popover absolute z-20 flex items-center gap-0.5 rounded-md border p-0.5 shadow-md'
      style={{ top: position.top, right: position.right }}
    >
      <ControlButton label='Remove row' onClick={() => run('deleteRow')}>
        <Icons.minus />
      </ControlButton>
      <Icons.tableRow className='text-muted-foreground size-3.5' aria-hidden />
      <ControlButton label='Add row below' onClick={() => run('addRowAfter')}>
        <Icons.add />
      </ControlButton>
      <span className='bg-border mx-0.5 h-5 w-px' aria-hidden />
      <ControlButton label='Remove column' onClick={() => run('deleteColumn')}>
        <Icons.minus />
      </ControlButton>
      <Icons.tableColumn className='text-muted-foreground size-3.5' aria-hidden />
      <ControlButton label='Add column right' onClick={() => run('addColumnAfter')}>
        <Icons.add />
      </ControlButton>
      <span className='bg-border mx-0.5 h-5 w-px' aria-hidden />
      <ControlButton label='Remove table' destructive onClick={() => run('deleteTable')}>
        <Icons.trash />
      </ControlButton>
    </div>
  );
}

const keepEditorSelection = (event: MouseEvent) => event.preventDefault();

function ControlButton({
  label,
  destructive = false,
  onClick,
  children
}: {
  label: string;
  destructive?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={label}
            onMouseDown={keepEditorSelection}
            onClick={onClick}
            className={cn(
              destructive && 'text-destructive hover:bg-destructive/10 hover:text-destructive'
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side='bottom'>{label}</TooltipContent>
    </Tooltip>
  );
}
