'use client';

import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useState, type ReactNode } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { TOOLBAR_BUTTON_CLASS_NAME } from './toolbar-button';
import { useActiveToolType } from './use-active-tool';

type PrimitiveForm = 'rectangle' | 'diamond' | 'ellipse';

function ToolSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.5}
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      {children}
    </svg>
  );
}

/** Excalidraw's own icons for its shape tools. */
const PRIMITIVE_FORMS: { type: PrimitiveForm; label: string; keys: string[]; icon: ReactNode }[] = [
  {
    type: 'rectangle',
    label: 'Rectangle',
    keys: ['R', '2'],
    icon: (
      <ToolSvg>
        <rect x='4' y='4' width='16' height='16' rx='2' />
      </ToolSvg>
    )
  },
  {
    type: 'diamond',
    label: 'Diamond',
    keys: ['D', '3'],
    icon: (
      <ToolSvg>
        <path d='M10.5 20.4l-6.9 -6.9c-.781 -.781 -.781 -2.219 0 -3l6.9 -6.9c.781 -.781 2.219 -.781 3 0l6.9 6.9c.781 .781 .781 2.219 0 3l-6.9 6.9c-.781 .781 -2.219 .781 -3 0z' />
      </ToolSvg>
    )
  },
  {
    type: 'ellipse',
    label: 'Ellipse',
    keys: ['O', '4'],
    icon: (
      <ToolSvg>
        <circle cx='12' cy='12' r='9' />
      </ToolSvg>
    )
  }
];

function isPrimitiveForm(type: string): type is PrimitiveForm {
  return PRIMITIVE_FORMS.some((form) => form.type === type);
}

/**
 * Excalidraw's rectangle, diamond and ellipse tools folded into one toolbar cell. It shows the
 * shape in use or last used; a click picks that shape and lists the three. Their shortcuts still
 * pick them directly.
 */
export function PrimitiveFormsTool({ api }: { api: ExcalidrawImperativeAPI | null }) {
  const activeType = useActiveToolType(api);
  const [last, setLast] = useState<PrimitiveForm>('rectangle');
  const [open, setOpen] = useState(false);
  if (activeType && isPrimitiveForm(activeType) && activeType !== last) setLast(activeType);

  const shown = PRIMITIVE_FORMS.find((form) => form.type === last) ?? PRIMITIVE_FORMS[0];
  const active = activeType !== null && isPrimitiveForm(activeType);

  function pick(type: PrimitiveForm) {
    api?.setActiveTool({ type });
    setLast(type);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type='button'
        title='Primitive forms — R or D or O'
        aria-label='Primitive forms'
        aria-pressed={active}
        onClick={() => pick(last)}
        className={cn(TOOLBAR_BUTTON_CLASS_NAME, 'App-toolbar__primitives')}
      >
        <div className='ToolIcon__icon relative' aria-hidden='true'>
          {shown.icon}
          <span
            className='absolute right-1.5 bottom-1.5 size-1.5 bg-current opacity-60'
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent side='top' sideOffset={8} className='w-48 gap-0.5 p-1'>
        <p className='text-muted-foreground px-2 pt-1 pb-1.5 text-[11px] font-medium tracking-wide uppercase'>
          Primitive forms
        </p>
        {PRIMITIVE_FORMS.map((form) => (
          <button
            key={form.type}
            type='button'
            onClick={() => {
              pick(form.type);
              setOpen(false);
            }}
            className={cn(
              'hover:bg-accent flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm [&_svg]:size-4.5 [&_svg]:shrink-0',
              activeType === form.type && 'bg-accent'
            )}
          >
            {form.icon}
            <span className='flex-1'>{form.label}</span>
            <kbd className='text-muted-foreground font-sans text-[11px]'>{form.keys[0]}</kbd>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
