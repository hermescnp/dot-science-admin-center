'use client';

import type { ComponentType } from 'react';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { platformSpecs, YOUTUBE_TITLE_LIMIT, type PlatformId } from '../../constants/platforms';
import { postTextFor, useComposerStore, type ComposerDraft } from '../../store';
import {
  FacebookPreview,
  InstagramPreview,
  LinkedInPreview,
  TikTokPreview,
  XPreview,
  YouTubePreview,
  type PreviewProps
} from './platform-previews';

const previews: Record<PlatformId, ComponentType<PreviewProps>> = {
  instagram: InstagramPreview,
  facebook: FacebookPreview,
  linkedin: LinkedInPreview,
  x: XPreview,
  youtube: YouTubePreview,
  tiktok: TikTokPreview
};

export function PreviewPanel() {
  const draft = useComposerStore((s) => s.draft);

  if (draft.platforms.length === 0) {
    return (
      <div className='text-muted-foreground flex h-full min-h-60 items-center justify-center p-6 text-center text-sm'>
        Select at least one platform to see its preview.
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-5 p-4'>
      {draft.platforms.map((id) => (
        <PlatformPreview key={id} id={id} draft={draft} />
      ))}
    </div>
  );
}

function issuesFor(draft: ComposerDraft, id: PlatformId, text: string) {
  const spec = platformSpecs[id];
  const issues: string[] = [];
  if (text.length > spec.captionLimit) {
    issues.push(`${text.length - spec.captionLimit} characters over the limit`);
  }
  if (spec.hashtagLimit && draft.hashtags.length > spec.hashtagLimit) {
    issues.push(`Max ${spec.hashtagLimit} hashtags`);
  }
  if ((id === 'youtube' || id === 'tiktok') && !draft.media.some((m) => m.kind === 'video')) {
    issues.push('Needs a video');
  }
  if (id === 'instagram' && draft.media.length === 0) issues.push('Needs an image or video');
  if (id === 'youtube' && (draft.youtubeTitle || draft.topic).length > YOUTUBE_TITLE_LIMIT) {
    issues.push(`Title over ${YOUTUBE_TITLE_LIMIT} characters`);
  }
  return issues;
}

function PlatformPreview({ id, draft }: { id: PlatformId; draft: ComposerDraft }) {
  const spec = platformSpecs[id];
  const Icon = Icons[spec.icon];
  const Preview = previews[id];
  const text = postTextFor(draft, id);
  const issues = issuesFor(draft, id, text);

  return (
    <section className='flex flex-col gap-2'>
      <header className='flex items-center gap-2'>
        <Icon className='size-4' />
        <span className='text-sm font-medium'>{spec.name}</span>
        {draft.overrides[id] !== undefined && (
          <Badge variant='outline' className='text-[0.65rem]'>
            Custom copy
          </Badge>
        )}
        <span
          className={cn(
            'ml-auto text-xs tabular-nums',
            text.length > spec.captionLimit ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {text.length} / {spec.captionLimit}
        </span>
      </header>
      <div
        className={cn(
          'overflow-hidden rounded-lg border shadow-xs',
          id === 'tiktok' && 'border-0 shadow-none'
        )}
      >
        <Preview draft={draft} text={text} />
      </div>
      {issues.length > 0 && (
        <ul className='text-destructive flex flex-col gap-0.5 text-xs'>
          {issues.map((issue) => (
            <li key={issue} className='flex items-center gap-1'>
              <Icons.warning className='size-3.5' />
              {issue}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
