'use client';

import { useState, type ComponentProps } from 'react';
import { Icons, type Icon } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { LayoutAnchor } from '../../api/types';

type DraftFieldProps<P> = Omit<P, 'value' | 'onChange' | 'onFocus' | 'onBlur'> & {
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * Edits reach the screen through the query cache, which re-renders a tick after the keystroke;
 * a controlled field would then jump its caret to the end. While focused the field shows its own
 * draft instead, and falls back to the stored value on blur.
 */
function useDraftField(value: string, onValueChange: (value: string) => void) {
  const [draft, setDraft] = useState<string | null>(null);
  return {
    value: draft ?? value,
    onFocus: () => setDraft(value),
    onBlur: () => setDraft(null),
    onChange: (event: { target: { value: string } }) => {
      setDraft(event.target.value);
      onValueChange(event.target.value);
    }
  };
}

export function DraftInput({
  value,
  onValueChange,
  ...props
}: DraftFieldProps<ComponentProps<typeof Input>>) {
  return <Input {...props} {...useDraftField(value, onValueChange)} />;
}

export function DraftTextarea({
  value,
  onValueChange,
  ...props
}: DraftFieldProps<ComponentProps<typeof Textarea>>) {
  return <Textarea {...props} {...useDraftField(value, onValueChange)} />;
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon?: Icon;
  /** Shown instead of, or after, the icon. */
  text?: string;
}

interface ChoiceRowProps<T extends string> {
  label: string;
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  /** Wraps the options onto rows of this many; defaults to one row. */
  columns?: number;
}

/** A Figma-style segmented control, with the current choice named next to the label. */
export function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
  columns
}: ChoiceRowProps<T>) {
  const current = options.find((option) => option.value === value);
  return (
    <div className='space-y-1.5'>
      <div className='flex items-baseline justify-between gap-2'>
        <Label className='text-xs'>{label}</Label>
        {current?.icon && !current.text ? (
          <span className='text-muted-foreground truncate text-[11px]'>{current.label}</span>
        ) : null}
      </div>
      <div
        role='radiogroup'
        aria-label={label}
        style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
        className='bg-muted/60 grid gap-0.5 rounded-md p-0.5'
      >
        {options.map((option) => (
          <ChoiceButton
            key={option.value}
            option={option}
            selected={option.value === value}
            onSelect={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

interface ChoiceButtonProps<T extends string> {
  option: ChoiceOption<T>;
  selected: boolean;
  onSelect: () => void;
}

function ChoiceButton<T extends string>({ option, selected, onSelect }: ChoiceButtonProps<T>) {
  const OptionIcon = option.icon;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type='button'
            role='radio'
            aria-checked={selected}
            aria-label={option.label}
            className={cn(
              'flex h-7 min-w-0 items-center justify-center gap-1 rounded-[5px] px-1 text-xs transition-colors',
              selected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
            )}
            onClick={onSelect}
          />
        }
      >
        {OptionIcon ? <OptionIcon className='size-4 shrink-0' /> : null}
        {option.text ? <span className='truncate'>{option.text}</span> : null}
      </TooltipTrigger>
      <TooltipContent side='bottom'>{option.label}</TooltipContent>
    </Tooltip>
  );
}

const ANCHOR_GRID: readonly { anchor: LayoutAnchor; label: string }[] = [
  { anchor: 'top-left', label: 'Top left' },
  { anchor: 'top', label: 'Top' },
  { anchor: 'top-right', label: 'Top right' },
  { anchor: 'left', label: 'Left' },
  { anchor: 'center', label: 'Center' },
  { anchor: 'right', label: 'Right' },
  { anchor: 'bottom-left', label: 'Bottom left' },
  { anchor: 'bottom', label: 'Bottom' },
  { anchor: 'bottom-right', label: 'Bottom right' }
];

const POSITION_MODES: readonly ChoiceOption<'flow' | 'pinned'>[] = [
  { value: 'flow', label: 'In flow', icon: Icons.layoutRows, text: 'Flow' },
  { value: 'pinned', label: 'Pinned over the parent', icon: Icons.pin, text: 'Pinned' }
];

interface AnchorPickerProps {
  value: LayoutAnchor | undefined;
  onChange: (anchor: LayoutAnchor | undefined) => void;
}

/** In flow, or pinned to one of nine spots in the parent, picked on a 3×3 grid. */
export function AnchorPicker({ value, onChange }: AnchorPickerProps) {
  const current = ANCHOR_GRID.find(({ anchor }) => anchor === value);
  return (
    <div className='flex items-center gap-3'>
      <div
        role='radiogroup'
        aria-label='Pin position'
        className='bg-muted/60 grid size-[4.5rem] shrink-0 grid-cols-3 grid-rows-3 rounded-md border p-0.5'
      >
        {ANCHOR_GRID.map(({ anchor, label }) => {
          const selected = anchor === value;
          return (
            <Tooltip key={anchor}>
              <TooltipTrigger
                render={
                  <button
                    type='button'
                    role='radio'
                    aria-checked={selected}
                    aria-label={`Pin ${label.toLowerCase()}`}
                    className='group flex items-center justify-center rounded-sm transition-colors hover:bg-background/60'
                    onClick={() => onChange(selected ? undefined : anchor)}
                  />
                }
              >
                <span
                  className={cn(
                    'rounded-full transition-all',
                    selected
                      ? 'bg-primary size-2.5'
                      : 'bg-muted-foreground/40 group-hover:bg-foreground size-1.5'
                  )}
                />
              </TooltipTrigger>
              <TooltipContent side='bottom'>
                {selected ? 'Back to flow' : `Pin ${label.toLowerCase()}`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className='min-w-0 flex-1'>
        <ChoiceRow
          label='Position'
          value={value ? 'pinned' : 'flow'}
          options={POSITION_MODES}
          onChange={(mode) => onChange(mode === 'flow' ? undefined : (value ?? 'top'))}
        />
        <p className='text-muted-foreground mt-1.5 text-[11px]'>
          {current ? `Pinned ${current.label.toLowerCase()}` : 'Follows its siblings'}
        </p>
      </div>
    </div>
  );
}
