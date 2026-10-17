'use client';

import { Fragment, useRef } from 'react';
import { Icons } from '@/components/icons';
import { ToolbarTooltips } from '@/components/whiteboard/toolbar-tooltips';
import { cn } from '@/lib/utils';
import type { NodeType } from '../../api/types';
import { componentTone } from '../../lib/components';
import { containerTone, NODE_LABELS } from '../../lib/node-tree';
import { NODE_ICONS } from './node-icons';
import { NODE_DRAG_MIME } from './wireframe-context';

const GROUPS: { label: string; types: NodeType[] }[] = [
  { label: 'Containers', types: ['section', 'form', 'column-layout', 'list', 'tabs-bar'] },
  {
    label: 'Elements',
    types: ['button', 'field', 'text', 'data-display', 'search-bar', 'image-carousel']
  }
];

const TOOLTIP_SELECTOR = '[data-library-bar] [data-toolbar-tooltip]';

interface ElementLibraryBarProps {
  /** Click-to-add, into the selected container or the page root. */
  onAdd: (type: NodeType) => void;
  onDragEnd: () => void;
  componentsOpen: boolean;
  onToggleComponents: () => void;
  className?: string;
}

/**
 * The containers and elements a screen can hold, docked to the bottom edge like the free design
 * toolbar. Drag a cell onto the screen or the structure tree, or click it to add it to the
 * selected container.
 */
export function ElementLibraryBar({
  onAdd,
  onDragEnd,
  componentsOpen,
  onToggleComponents,
  className
}: ElementLibraryBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={barRef}
      data-library-bar
      role='toolbar'
      aria-label='Element library'
      className={cn(
        'bg-background/60 flex max-w-full overflow-x-auto rounded-t-xl border border-b-0 backdrop-blur-md dark:border-white/10 dark:bg-black/20',
        className
      )}
    >
      {GROUPS.map((group, groupIndex) => (
        <Fragment key={group.label}>
          {groupIndex > 0 ? (
            <span aria-hidden className='bg-border w-1.5 shrink-0 dark:bg-white/10' />
          ) : null}
          <div role='group' aria-label={group.label} className='flex'>
            {group.types.map((type, index) => {
              const NodeIcon = NODE_ICONS[type];
              const first = groupIndex === 0 && index === 0;
              return (
                <button
                  key={type}
                  type='button'
                  draggable
                  aria-label={`Add ${NODE_LABELS[type]}`}
                  data-toolbar-tooltip={`${NODE_LABELS[type]} — ${group.label === 'Containers' ? 'Container' : 'Element'}`}
                  data-toolbar-tooltip-color={containerTone(type) ?? undefined}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(NODE_DRAG_MIME, type);
                    event.dataTransfer.effectAllowed = 'copy';
                  }}
                  onDragEnd={onDragEnd}
                  onClick={() => onAdd(type)}
                  className={cn(
                    'text-muted-foreground hover:bg-accent/60 hover:text-foreground flex h-10 w-11 shrink-0 cursor-grab items-center justify-center transition-colors duration-300 active:cursor-grabbing dark:hover:bg-[#0b1e33]',
                    index > 0 &&
                      'shadow-[inset_1px_0_0_var(--border)] dark:shadow-[inset_1px_0_0_rgb(255_255_255/0.1)]',
                    first && 'rounded-tl-xl'
                  )}
                >
                  <NodeIcon className='size-4.5' />
                </button>
              );
            })}
          </div>
        </Fragment>
      ))}
      <span aria-hidden className='bg-border w-1.5 shrink-0 dark:bg-white/10' />
      {/* A library rather than an element: always in the component violet, and labelled. */}
      <div role='group' aria-label='Reusable components' className='flex'>
        <button
          type='button'
          aria-label='Reusable components'
          aria-pressed={componentsOpen}
          data-toolbar-tooltip='Reusable components'
          data-toolbar-tooltip-color={componentTone()}
          onClick={onToggleComponents}
          style={{
            color: componentTone(),
            backgroundColor: componentTone(componentsOpen ? 0.22 : 0.1),
            boxShadow: componentsOpen ? `inset 0 0 0 1px ${componentTone(0.6)}` : undefined
          }}
          className='flex h-10 shrink-0 items-center gap-1.5 rounded-tr-xl px-3 text-xs font-medium transition-colors duration-300 hover:brightness-125'
        >
          <Icons.component className='size-4.5' />
          Components
        </button>
      </div>
      <ToolbarTooltips containerRef={barRef} selector={TOOLTIP_SELECTOR} />
    </div>
  );
}
