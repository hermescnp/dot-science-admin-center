'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  buildComponentPreviewSrcDoc,
  componentPreviewBody,
  PREVIEW_HEIGHT_MESSAGE
} from '../../lib/component-wireframe-css';
import { tagPreviewElements } from '../../lib/preview-layout';

/** Shown until the preview reports its own content height. */
const INITIAL_HEIGHT = 48;

/** The body's padding alone: what an empty or not-yet-rendered preview reports. */
const EMPTY_HEIGHT = 8;

/**
 * Last measured height of each preview. Lets remounts start at the right size and a skeleton
 * keep the size of the preview it replaces.
 */
const measuredHeights = new Map<string, number>();

/** The preview HTML each mounted frame shows; screenshots can't look inside the frames. */
const previewHtmls = new WeakMap<HTMLIFrameElement, string>();

/** The preview HTML shown in `iframe`, or null when it isn't a preview frame. */
export function previewHtmlOf(iframe: HTMLIFrameElement): string | null {
  return previewHtmls.get(iframe) ?? null;
}

function useRegisterPreviewHtml(ref: RefObject<HTMLIFrameElement | null>, html: string) {
  useEffect(() => {
    if (ref.current) previewHtmls.set(ref.current, html);
  }, [ref, html]);
}

interface ComponentPreviewFrameProps {
  html: string;
  className?: string;
}

/**
 * Sandboxed interactive wireframe preview, sized to its content; scripts run, but nothing
 * reaches the parent origin.
 */
export function ComponentPreviewFrame({ html, className }: ComponentPreviewFrameProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(() => measuredHeights.get(html) ?? INITIAL_HEIGHT);
  const srcDoc = useMemo(() => buildComponentPreviewSrcDoc(html), [html]);
  useRegisterPreviewHtml(ref, html);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== ref.current?.contentWindow) return;
      const data = event.data as { type?: unknown; height?: unknown } | null;
      if (data?.type !== PREVIEW_HEIGHT_MESSAGE || typeof data.height !== 'number') return;
      // Hidden frames aren't laid out and report only the padding; keep the last real height.
      if (!Number.isFinite(data.height) || data.height <= EMPTY_HEIGHT) return;
      const next = Math.ceil(data.height);
      measuredHeights.set(html, next);
      setHeight(next);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [html]);

  return (
    <iframe
      ref={ref}
      title='Component preview'
      sandbox='allow-scripts'
      referrerPolicy='no-referrer'
      srcDoc={srcDoc}
      className={cn('block w-full border-0 bg-transparent', className)}
      style={{ height, pointerEvents: 'auto' }}
    />
  );
}

interface EditablePreviewFrameProps {
  html: string;
  /** The instance the frame shows, so the layout editor can find it on the board. */
  instanceId: string;
  className?: string;
}

/**
 * The preview as a static, same-origin document whose layout the editor reads and changes in
 * place. Scripts never run (the sandbox has no `allow-scripts`); new HTML replaces the content
 * without reloading, so the editor's references to the document stay valid.
 */
export function EditablePreviewFrame({ html, instanceId, className }: EditablePreviewFrameProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const tagged = useMemo(() => tagPreviewElements(html), [html]);
  const [srcDoc] = useState(() => buildComponentPreviewSrcDoc(tagged, { scripts: false }));
  const [height, setHeight] = useState(() => measuredHeights.get(html) ?? INITIAL_HEIGHT);
  const [doc, setDoc] = useState<Document | null>(null);
  const shownRef = useRef(tagged);
  const htmlRef = useRef(html);
  useRegisterPreviewHtml(ref, html);

  useEffect(() => {
    htmlRef.current = html;
  }, [html]);

  useEffect(() => {
    if (!doc || shownRef.current === tagged) return;
    shownRef.current = tagged;
    const root = doc.getElementById('wf-root');
    if (root) root.innerHTML = componentPreviewBody(tagged);
  }, [doc, tagged]);

  useEffect(() => {
    const root = doc?.getElementById('wf-root');
    if (!root) return;
    const observer = new ResizeObserver(() => {
      const next = Math.ceil(root.getBoundingClientRect().height + 8);
      if (next <= EMPTY_HEIGHT) return;
      measuredHeights.set(htmlRef.current, next);
      setHeight(next);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [doc]);

  return (
    <iframe
      ref={ref}
      title='Component preview'
      sandbox='allow-same-origin'
      referrerPolicy='no-referrer'
      srcDoc={srcDoc}
      data-preview-frame={instanceId}
      onLoad={() => setDoc(ref.current?.contentDocument ?? null)}
      className={cn('block w-full border-0 bg-transparent', className)}
      style={{ height, pointerEvents: 'none' }}
    />
  );
}

/**
 * Stands in for a preview being generated, at the size of the preview it replaces so the
 * screen doesn't jump when the new one arrives.
 */
export function ComponentPreviewSkeleton({ previousHtml }: { previousHtml: string | null }) {
  const height = (previousHtml && measuredHeights.get(previousHtml)) || INITIAL_HEIGHT;
  return (
    <div
      aria-busy='true'
      aria-label='Generating component preview'
      className='flex flex-col gap-2 p-1'
      style={{ height }}
    >
      <Skeleton className='bg-foreground/10 min-h-0 flex-1 rounded-md' />
      <Skeleton className='bg-foreground/10 h-2.5 w-2/5 shrink-0' />
    </div>
  );
}
