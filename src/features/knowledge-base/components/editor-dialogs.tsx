'use client';

import {
  INTERACTIVE_GRAPHIC_DEFAULT_HEIGHT,
  INTERACTIVE_GRAPHIC_MAX_HEIGHT,
  INTERACTIVE_GRAPHIC_MIN_HEIGHT,
  VECTOR_GRAPHIC_MAX_WIDTH,
  clampInteractiveGraphicHeight,
  interactiveGraphicFigureHtml,
  normalizeInteractiveCode,
  sanitizeSvg,
  vectorGraphicFigureHtml,
  type InteractiveGraphicLayout,
  type VectorGraphicLayout
} from '@hermescnp/content-blocks';
import { useMutation } from '@tanstack/react-query';
import { renderToString } from 'katex';
import { useDeferredValue, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
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
import { generateInteractiveGraphic, generateVectorGraphic } from '../api/service';
import type { MathKind } from '../editor/extensions';

interface PromptShellProps {
  title: string;
  description: string;
  submitLabel: string;
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => void;
  extraAction?: ReactNode;
  className?: string;
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
  className,
  children
}: PromptShellProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn('sm:max-w-md', className)}
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

const VECTOR_GRAPHIC_ALIGNS = ['left', 'center', 'right'] as const;

interface VectorGraphicDialogProps {
  initialSvg: string;
  initialLayout: VectorGraphicLayout;
  editing: boolean;
  layerTitle?: string;
  onClose: () => void;
  onSubmit: (svg: string, layout: VectorGraphicLayout) => void;
  onRemove?: () => void;
}

export function VectorGraphicDialog({
  initialSvg,
  initialLayout,
  editing,
  layerTitle,
  onClose,
  onSubmit,
  onRemove
}: VectorGraphicDialogProps) {
  const [source, setSource] = useState(initialSvg);
  const [width, setWidth] = useState(initialLayout.width ? String(initialLayout.width) : '');
  const [align, setAlign] = useState(initialLayout.align ?? 'center');
  const [description, setDescription] = useState('');

  const generate = useMutation({
    mutationFn: generateVectorGraphic,
    onSuccess: ({ svg }) => setSource(svg),
    onError: (error) => toast.error(`Could not generate the graphic: ${error.message}`)
  });

  const sanitized = source.trim() ? sanitizeSvg(source) : null;
  const parsedWidth = Math.round(Number(width));
  const layout: VectorGraphicLayout = {
    ...(Number.isFinite(parsedWidth) && parsedWidth > 0
      ? { width: Math.min(parsedWidth, VECTOR_GRAPHIC_MAX_WIDTH) }
      : {}),
    align
  };

  return (
    <PromptShell
      title={editing ? 'Edit vector graphic' : 'Insert vector graphic'}
      description='Paste SVG code or describe the graphic and generate it. Scripts, event handlers and external resources are removed.'
      submitLabel={editing ? 'Update' : 'Insert'}
      canSubmit={sanitized !== null}
      onClose={onClose}
      onSubmit={() => sanitized && onSubmit(sanitized, layout)}
      className='sm:max-w-3xl'
      extraAction={
        onRemove ? (
          <Button
            type='button'
            variant='ghost'
            className='text-destructive sm:mr-auto'
            onClick={onRemove}
          >
            Remove graphic
          </Button>
        ) : null
      }
    >
      <div className='grid gap-4'>
        <div className='grid gap-2'>
          <Label htmlFor='layer-vector-graphic-description'>Describe the graphic</Label>
          <div className='flex gap-2'>
            <Input
              id='layer-vector-graphic-description'
              value={description}
              placeholder='A three-step flow from research to launch'
              onChange={(event) => setDescription(event.target.value)}
            />
            <Button
              type='button'
              variant='outline'
              disabled={!description.trim() || generate.isPending}
              onClick={() =>
                generate.mutate({
                  description: description.trim(),
                  currentSvg: sanitized ?? undefined,
                  layerTitle
                })
              }
            >
              {generate.isPending ? <Icons.spinner className='animate-spin' /> : <Icons.sparkles />}
              Generate
            </Button>
          </div>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='grid gap-2'>
            <Label htmlFor='layer-vector-graphic-source'>SVG code</Label>
            <Textarea
              id='layer-vector-graphic-source'
              rows={12}
              spellCheck={false}
              value={source}
              placeholder='<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">…</svg>'
              onChange={(event) => setSource(event.target.value)}
              className='max-h-80 font-mono text-xs'
            />
            {source.trim() && !sanitized ? (
              <p className='text-destructive text-xs'>
                Not a valid SVG. It needs a root &lt;svg&gt; with a viewBox (or width and height).
              </p>
            ) : null}
          </div>
          <div className='grid content-start gap-2'>
            <Label>Preview</Label>
            <div
              className='bg-muted/40 flex max-h-80 min-h-40 overflow-auto rounded-md border p-3 [&_figure]:w-full [&_figure[data-align=center]]:mx-auto [&_figure[data-align=left]]:mr-auto [&_figure[data-align=right]]:ml-auto [&_svg]:block [&_svg]:h-auto [&_svg]:w-full'
              // The figure HTML comes from the sanitizer, not the raw input.
              dangerouslySetInnerHTML={{
                __html: sanitized
                  ? vectorGraphicFigureHtml(sanitized, layout)
                  : '<span class="text-muted-foreground text-xs">Preview</span>'
              }}
            />
            <div className='flex flex-wrap items-end gap-3'>
              <div className='grid gap-1.5'>
                <Label htmlFor='layer-vector-graphic-width'>Max width (px)</Label>
                <Input
                  id='layer-vector-graphic-width'
                  type='number'
                  min={16}
                  max={VECTOR_GRAPHIC_MAX_WIDTH}
                  value={width}
                  placeholder='Full'
                  onChange={(event) => setWidth(event.target.value)}
                  className='h-8 w-28'
                />
              </div>
              <div className='flex gap-1'>
                {VECTOR_GRAPHIC_ALIGNS.map((entry) => (
                  <Button
                    key={entry}
                    type='button'
                    size='sm'
                    variant={entry === align ? 'secondary' : 'ghost'}
                    onClick={() => setAlign(entry)}
                  >
                    {entry[0].toUpperCase() + entry.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PromptShell>
  );
}

interface InteractiveGraphicDialogProps {
  initialCode: string;
  initialLayout: InteractiveGraphicLayout;
  editing: boolean;
  layerTitle?: string;
  onClose: () => void;
  onSubmit: (code: string, layout: InteractiveGraphicLayout) => void;
  onRemove?: () => void;
}

export function InteractiveGraphicDialog({
  initialCode,
  initialLayout,
  editing,
  layerTitle,
  onClose,
  onSubmit,
  onRemove
}: InteractiveGraphicDialogProps) {
  const [source, setSource] = useState(initialCode);
  const [height, setHeight] = useState(initialLayout.height ? String(initialLayout.height) : '');
  const [description, setDescription] = useState('');

  const generate = useMutation({
    mutationFn: generateInteractiveGraphic,
    onSuccess: ({ code }) => setSource(code),
    onError: (error) => toast.error(`Could not generate the interactive graphic: ${error.message}`)
  });

  const code = normalizeInteractiveCode(source);
  const parsedHeight = Number(height);
  const layout: InteractiveGraphicLayout =
    Number.isFinite(parsedHeight) && parsedHeight > 0
      ? { height: clampInteractiveGraphicHeight(parsedHeight) }
      : {};
  const previewCode = useDeferredValue(code);

  return (
    <PromptShell
      title={editing ? 'Edit interactive graphic' : 'Insert interactive graphic'}
      description='Paste an HTML snippet with its CSS and JavaScript, or describe it and generate it. It runs in an isolated frame with no network access.'
      submitLabel={editing ? 'Update' : 'Insert'}
      canSubmit={code !== null}
      onClose={onClose}
      onSubmit={() => code && onSubmit(code, layout)}
      className='sm:max-w-4xl'
      extraAction={
        onRemove ? (
          <Button
            type='button'
            variant='ghost'
            className='text-destructive sm:mr-auto'
            onClick={onRemove}
          >
            Remove graphic
          </Button>
        ) : null
      }
    >
      <div className='grid gap-4'>
        <div className='grid gap-2'>
          <Label htmlFor='layer-interactive-graphic-description'>
            Describe the interactive graphic
          </Label>
          <div className='flex gap-2'>
            <Input
              id='layer-interactive-graphic-description'
              value={description}
              placeholder='A slider that shows how spacing tokens scale from 4px to 64px'
              onChange={(event) => setDescription(event.target.value)}
            />
            <Button
              type='button'
              variant='outline'
              disabled={!description.trim() || generate.isPending}
              onClick={() =>
                generate.mutate({
                  description: description.trim(),
                  currentCode: code ?? undefined,
                  height: layout.height,
                  layerTitle
                })
              }
            >
              {generate.isPending ? <Icons.spinner className='animate-spin' /> : <Icons.sparkles />}
              Generate
            </Button>
          </div>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='grid gap-2'>
            <Label htmlFor='layer-interactive-graphic-source'>HTML/CSS/JS code</Label>
            <Textarea
              id='layer-interactive-graphic-source'
              rows={14}
              spellCheck={false}
              value={source}
              placeholder={'<style>…</style>\n<div id="app">…</div>\n<script>…</script>'}
              onChange={(event) => setSource(event.target.value)}
              className='max-h-96 font-mono text-xs'
            />
            {source.trim() && !code ? (
              <p className='text-destructive text-xs'>The code exceeds the 200 KB limit.</p>
            ) : null}
          </div>
          <div className='grid content-start gap-2'>
            <Label>Preview</Label>
            <div
              className='bg-muted/40 max-h-96 min-h-40 overflow-auto rounded-md border p-3 [&_iframe]:block [&_iframe]:w-full [&_iframe]:border-0'
              // The code only ever runs inside the sandboxed srcdoc iframe.
              dangerouslySetInnerHTML={{
                __html: previewCode
                  ? interactiveGraphicFigureHtml(previewCode, layout)
                  : '<span class="text-muted-foreground text-xs">Preview</span>'
              }}
            />
            <div className='grid gap-1.5'>
              <Label htmlFor='layer-interactive-graphic-height'>Height (px)</Label>
              <Input
                id='layer-interactive-graphic-height'
                type='number'
                min={INTERACTIVE_GRAPHIC_MIN_HEIGHT}
                max={INTERACTIVE_GRAPHIC_MAX_HEIGHT}
                value={height}
                placeholder={String(INTERACTIVE_GRAPHIC_DEFAULT_HEIGHT)}
                onChange={(event) => setHeight(event.target.value)}
                className='h-8 w-28'
              />
            </div>
          </div>
        </div>
      </div>
    </PromptShell>
  );
}
