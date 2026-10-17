'use client';

import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

const LABEL_ATTR = 'data-toolbar-tooltip';
const BADGE_COLOR_ATTR = 'data-toolbar-tooltip-color';
const OPEN_DELAY = 400;
const CLOSE_GRACE = 100;
const TARGET_SELECTOR = `.excalidraw:not(.excalidraw--mobile) .App-toolbar :is([title], [${LABEL_ATTR}])`;

interface ToolbarTooltipState {
  open: boolean;
  centerX: number;
  top: number;
  label: string;
  keys: string[];
  badgeColor: string | null;
}

/** Excalidraw titles read like `Rectangle — R or 2`. */
function parseTitle(title: string) {
  const [label, shortcut] = title.split(' — ');
  return { label, keys: shortcut ? shortcut.split(' or ') : [] };
}

interface ToolbarTooltipsProps {
  containerRef: RefObject<HTMLElement | null>;
  /** Cells that get a tooltip, labelled by `title` or `data-toolbar-tooltip`. */
  selector?: string;
}

/**
 * Replaces the native `title` tooltips of Excalidraw's desktop toolbar with styled ones shown
 * above the hovered cell. Excalidraw renders those buttons itself, so hover is tracked by
 * delegation. The toolbar doesn't move while hovered, so the tooltip is placed once from the
 * cell's rect.
 */
export function ToolbarTooltips({
  containerRef,
  selector = TARGET_SELECTOR
}: ToolbarTooltipsProps) {
  const [tooltip, setTooltip] = useState<ToolbarTooltipState | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let current: HTMLElement | null = null;
    let isOpen = false;
    let timer: number | undefined;

    const schedule = (callback: () => void, delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(callback, delay);
    };
    const show = (target: HTMLElement) => {
      const title = target.getAttribute(LABEL_ATTR);
      if (!title || !target.isConnected) return;
      const rect = target.getBoundingClientRect();
      isOpen = true;
      setTooltip({
        open: true,
        centerX: rect.left + rect.width / 2,
        top: rect.top,
        badgeColor: target.getAttribute(BADGE_COLOR_ATTR),
        ...parseTitle(title)
      });
    };
    const hide = () => {
      isOpen = false;
      setTooltip((prev) => (prev ? { ...prev, open: false } : prev));
    };

    function handlePointerOver(event: PointerEvent) {
      if (event.pointerType === 'touch' || !(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>(selector);
      if (target === current) return;
      current = target;
      if (!target) {
        schedule(hide, CLOSE_GRACE);
        return;
      }
      const title = target.getAttribute('title');
      if (title) {
        target.setAttribute(LABEL_ATTR, title);
        target.removeAttribute('title');
      }
      if (isOpen) {
        window.clearTimeout(timer);
        show(target);
      } else {
        schedule(() => show(target), OPEN_DELAY);
      }
    }

    function handlePointerLeave() {
      current = null;
      schedule(hide, CLOSE_GRACE);
    }

    // Like Radix/IAteneo tooltips: a click dismisses it until the pointer moves to another cell.
    function handlePointerDown() {
      window.clearTimeout(timer);
      hide();
    }

    container.addEventListener('pointerover', handlePointerOver);
    container.addEventListener('pointerleave', handlePointerLeave);
    container.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      window.clearTimeout(timer);
      container.removeEventListener('pointerover', handlePointerOver);
      container.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [containerRef, selector]);

  if (!tooltip) return null;

  return createPortal(
    <div
      className='pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full pb-2'
      style={{ left: tooltip.centerX, top: tooltip.top }}
    >
      <div
        role='tooltip'
        onAnimationEnd={() => {
          if (!tooltip.open) setTooltip(null);
        }}
        className={cn(
          'inline-flex w-max max-w-[18rem] items-center gap-2 rounded-lg bg-black px-3 py-2 text-xs leading-[1.4] font-extralight text-balance text-white shadow-[0_8px_32px_rgb(104_209_255/0.15),0_4px_16px_rgb(0_0_0/0.3)] backdrop-blur-[10px]',
          tooltip.open
            ? 'animate-in duration-200 ease-out fade-in-0 zoom-in-95 slide-in-from-bottom-1'
            : 'animate-out duration-150 ease-in fill-mode-forwards fade-out-0 zoom-out-95 slide-out-to-bottom-1'
        )}
      >
        {tooltip.label}
        {tooltip.keys.length > 0 ? (
          <span className='inline-flex items-center gap-1'>
            {tooltip.keys.map((key) => (
              <kbd
                key={key}
                style={
                  tooltip.badgeColor
                    ? {
                        color: tooltip.badgeColor,
                        backgroundColor: `color-mix(in oklch, ${tooltip.badgeColor} 22%, transparent)`
                      }
                    : undefined
                }
                className='inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-sm bg-white/12 px-1 font-sans text-[0.6875rem] font-normal text-white/70'
              >
                {key}
              </kbd>
            ))}
          </span>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
