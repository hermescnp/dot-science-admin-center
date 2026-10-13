'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { ACCOUNT } from '../../constants/platforms';
import type { ComposerMedia } from '../../store';

export function AccountAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        className
      )}
    >
      {ACCOUNT.initials}
    </div>
  );
}

interface PreviewMediaProps {
  media: ComposerMedia[];
  aspect: string;
  className?: string;
}

export function PreviewMedia({ media, aspect, className }: PreviewMediaProps) {
  const first = media[0];
  return (
    <div
      className={cn('bg-muted relative w-full overflow-hidden', className)}
      style={{ aspectRatio: aspect }}
    >
      {first ? (
        first.kind === 'video' ? (
          <video src={first.url} className='size-full object-cover' muted playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
          <img src={first.url} alt={first.name} className='size-full object-cover' />
        )
      ) : (
        <div className='text-muted-foreground flex size-full flex-col items-center justify-center gap-1 text-xs'>
          <Icons.photo className='size-6 opacity-60' />
          No media
        </div>
      )}
      {media.length > 1 && (
        <span className='absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[0.65rem] text-white'>
          1/{media.length}
        </span>
      )}
    </div>
  );
}

interface ExpandableTextProps {
  text: string;
  previewChars?: number;
  className?: string;
  placeholder?: string;
}

/** Feed-style text: cut at `previewChars` with a "more" toggle, hashtags highlighted. */
export function ExpandableText({
  text,
  previewChars,
  className,
  placeholder = 'Your caption will appear here.'
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <p className={cn('text-muted-foreground italic', className)}>{placeholder}</p>;

  const truncated = !expanded && previewChars !== undefined && text.length > previewChars;
  const shown = truncated ? `${text.slice(0, previewChars).trimEnd()}… ` : text;

  return (
    <p className={cn('break-words whitespace-pre-wrap', className)}>
      {shown.split(/(#[\p{L}\p{N}_]+)/u).map((part, i) =>
        part.startsWith('#') ? (
          <span key={i} className='text-sky-600 dark:text-sky-400'>
            {part}
          </span>
        ) : (
          part
        )
      )}
      {truncated && (
        <button
          type='button'
          className='text-muted-foreground font-medium'
          onClick={() => setExpanded(true)}
        >
          more
        </button>
      )}
    </p>
  );
}

export function linkHost(link: string) {
  try {
    return new URL(link).host.replace(/^www\./, '');
  } catch {
    return link;
  }
}
