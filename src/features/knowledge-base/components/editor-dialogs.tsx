'use client';

import { renderToString } from 'katex';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { MathKind } from '../editor/extensions';

interface PromptShellProps {
  title: string;
  description: string;
  submitLabel: string;
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => void;
  extraAction?: ReactNode;
  children: ReactNode;
}

/**
 * Not a <form>: these dialogs render inside the layer form's React tree, and a nested
 * form's submit event would bubble up and save the layer.
 */
function PromptShell({
  title,
  description,
  submitLabel,
  canSubmit,
  onClose,
  onSubmit,
  extraAction,
  children
}: PromptShellProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className='sm:max-w-md'
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          const { target } = event;
          const submits =
            target instanceof HTMLInputElement ||
            (target instanceof HTMLTextAreaElement && (event.metaKey || event.ctrlKey));
          if (!submits) return;
          event.preventDefault();
          if (canSubmit) onSubmit();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          {extraAction}
          <Button type='button' variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button type='button' disabled={!canSubmit} onClick={onSubmit}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface LinkDialogProps {
  initialHref: string;
  onClose: () => void;
  onSubmit: (href: string | null) => void;
}

export function LinkDialog({ initialHref, onClose, onSubmit }: LinkDialogProps) {
  const [href, setHref] = useState(initialHref || 'https://');
  const trimmed = href.trim();

  return (
    <PromptShell
      title={initialHref ? 'Edit link' : 'Add link'}
      description='Link to a web page, or to another layer with ?layer=its-slug.'
      submitLabel='Apply'
      canSubmit={trimmed !== '' && trimmed !== 'https://'}
      onClose={onClose}
      onSubmit={() => onSubmit(trimmed)}
      extraAction={
        initialHref ? (
          <Button
            type='button'
            variant='ghost'
            className='text-destructive sm:mr-auto'
            onClick={() => onSubmit(null)}
          >
            Remove link
          </Button>
        ) : null
      }
    >
      <div className='grid gap-2'>
        <Label htmlFor='layer-link-href'>URL</Label>
        <Input
          id='layer-link-href'
          autoFocus
          value={href}
          onChange={(event) => setHref(event.target.value)}
          onFocus={(event) => event.target.select()}
        />
      </div>
    </PromptShell>
  );
}

interface MathDialogProps {
  initialLatex: string;
  /** Fixed when editing an existing formula; switchable when inserting a new one. */
  initialKind: MathKind;
  editing: boolean;
  onClose: () => void;
  onSubmit: (latex: string, kind: MathKind) => void;
  onRemove?: () => void;
}

export function MathDialog({
  initialLatex,
  initialKind,
  editing,
  onClose,
  onSubmit,
  onRemove
}: MathDialogProps) {
  const [latex, setLatex] = useState(initialLatex);
  const [kind, setKind] = useState(initialKind);
  const trimmed = latex.trim();
  const preview = trimmed
    ? renderToString(trimmed, {
        displayMode: kind === 'block',
        throwOnError: false,
        strict: false
      })
    : '';

  return (
    <PromptShell
      title={editing ? 'Edit formula' : 'Insert formula'}
      description='Write LaTeX, for example \frac{a}{b} or \sum_{i=1}^{n} x_i. Press ⌘↵ to apply.'
      submitLabel={editing ? 'Update' : 'Insert'}
      canSubmit={trimmed !== ''}
      onClose={onClose}
      onSubmit={() => onSubmit(trimmed, kind)}
      extraAction={
        onRemove ? (
          <Button
            type='button'
            variant='ghost'
            className='text-destructive sm:mr-auto'
            onClick={onRemove}
          >
            Remove formula
          </Button>
        ) : null
      }
    >
      <div className='grid gap-3'>
        <div className='grid gap-2'>
          <Label htmlFor='layer-math-latex'>LaTeX</Label>
          <Textarea
            id='layer-math-latex'
            autoFocus
            rows={3}
            spellCheck={false}
            value={latex}
            onChange={(event) => setLatex(event.target.value)}
            className='font-mono text-sm'
          />
        </div>
        {editing ? null : (
          <Label className='flex items-center gap-2 font-normal'>
            <Switch
              checked={kind === 'block'}
              onCheckedChange={(checked) => setKind(checked ? 'block' : 'inline')}
            />
            Display as a centered block
          </Label>
        )}
        <div
          className={cn(
            'bg-muted/40 flex min-h-14 items-center overflow-x-auto rounded-md border px-3 py-2',
            kind === 'block' && 'justify-center'
          )}
          // KaTeX output is generated from the formula, not raw user HTML.
          dangerouslySetInnerHTML={{
            __html: preview || '<span class="text-muted-foreground text-xs">Preview</span>'
          }}
        />
      </div>
    </PromptShell>
  );
}
