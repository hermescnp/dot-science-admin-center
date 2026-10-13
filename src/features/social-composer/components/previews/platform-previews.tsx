'use client';

import { Icons } from '@/components/icons';
import { ACCOUNT, platformSpecs } from '../../constants/platforms';
import type { ComposerDraft } from '../../store';
import { AccountAvatar, ExpandableText, linkHost, PreviewMedia } from './preview-parts';

export interface PreviewProps {
  draft: ComposerDraft;
  text: string;
}

export function InstagramPreview({ draft, text }: PreviewProps) {
  const spec = platformSpecs.instagram;
  return (
    <div className='bg-background text-sm'>
      <div className='flex items-center gap-2 px-3 py-2'>
        <AccountAvatar className='size-8 ring-2 ring-pink-500 ring-offset-2 ring-offset-background' />
        <span className='font-semibold'>{ACCOUNT.handle}</span>
        <Icons.dots className='text-muted-foreground ml-auto size-4' />
      </div>
      <PreviewMedia media={draft.media} aspect={spec.aspect} />
      <div className='flex items-center gap-3 px-3 pt-2'>
        <Icons.heart className='size-5' />
        <Icons.messageCircle className='size-5' />
        <Icons.send className='size-5' />
        <Icons.bookmark className='ml-auto size-5' />
      </div>
      <div className='px-3 pt-1.5 pb-3'>
        <ExpandableText
          text={text ? `${ACCOUNT.handle} ${text}` : ''}
          previewChars={spec.previewChars}
        />
      </div>
    </div>
  );
}

export function FacebookPreview({ draft, text }: PreviewProps) {
  const spec = platformSpecs.facebook;
  return (
    <div className='bg-background text-sm'>
      <div className='flex items-center gap-2 px-3 pt-3'>
        <AccountAvatar />
        <div className='leading-tight'>
          <div className='font-semibold'>{ACCOUNT.name}</div>
          <div className='text-muted-foreground flex items-center gap-1 text-xs'>
            Just now · <Icons.globe className='size-3' />
          </div>
        </div>
      </div>
      <ExpandableText text={text} previewChars={spec.previewChars} className='px-3 py-2' />
      <PreviewMedia media={draft.media} aspect={spec.aspect} />
      {draft.link && <LinkStrip link={draft.link} title={draft.topic} cta={draft.callToAction} />}
      <div className='text-muted-foreground flex justify-around border-t py-2 text-xs font-medium'>
        <span className='flex items-center gap-1'>
          <Icons.thumbUp className='size-4' /> Like
        </span>
        <span className='flex items-center gap-1'>
          <Icons.messageCircle className='size-4' /> Comment
        </span>
        <span className='flex items-center gap-1'>
          <Icons.share className='size-4' /> Share
        </span>
      </div>
    </div>
  );
}

export function LinkedInPreview({ draft, text }: PreviewProps) {
  const spec = platformSpecs.linkedin;
  return (
    <div className='bg-background text-sm'>
      <div className='flex items-center gap-2 px-3 pt-3'>
        <AccountAvatar className='rounded-md' />
        <div className='leading-tight'>
          <div className='font-semibold'>{ACCOUNT.name}</div>
          <div className='text-muted-foreground text-xs'>Research platform</div>
          <div className='text-muted-foreground flex items-center gap-1 text-xs'>
            now · <Icons.globe className='size-3' />
          </div>
        </div>
      </div>
      <ExpandableText text={text} previewChars={spec.previewChars} className='px-3 py-2' />
      <PreviewMedia media={draft.media} aspect={spec.aspect} />
      {draft.link && <LinkStrip link={draft.link} title={draft.topic} cta={draft.callToAction} />}
      <div className='text-muted-foreground flex justify-around border-t py-2 text-xs font-medium'>
        <span className='flex items-center gap-1'>
          <Icons.thumbUp className='size-4' /> Like
        </span>
        <span className='flex items-center gap-1'>
          <Icons.messageCircle className='size-4' /> Comment
        </span>
        <span className='flex items-center gap-1'>
          <Icons.repeat className='size-4' /> Repost
        </span>
        <span className='flex items-center gap-1'>
          <Icons.send className='size-4' /> Send
        </span>
      </div>
    </div>
  );
}

export function XPreview({ draft, text }: PreviewProps) {
  const spec = platformSpecs.x;
  return (
    <div className='bg-background flex gap-2 p-3 text-sm'>
      <AccountAvatar />
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1'>
          <span className='font-semibold'>{ACCOUNT.name}</span>
          <span className='text-muted-foreground truncate'>@{ACCOUNT.handle} · now</span>
        </div>
        <ExpandableText text={text} className='mt-0.5' />
        {draft.media.length > 0 && (
          <PreviewMedia
            media={draft.media}
            aspect={spec.aspect}
            className='mt-2 rounded-xl border'
          />
        )}
        {draft.link && draft.media.length === 0 && (
          <div className='mt-2 overflow-hidden rounded-xl border'>
            <div className='text-muted-foreground px-3 py-2 text-xs'>{linkHost(draft.link)}</div>
          </div>
        )}
        <div className='text-muted-foreground mt-2 flex justify-between pr-6'>
          <Icons.messageCircle className='size-4' />
          <Icons.repeat className='size-4' />
          <Icons.heart className='size-4' />
          <Icons.chartBar className='size-4' />
          <Icons.bookmark className='size-4' />
        </div>
      </div>
    </div>
  );
}

export function YouTubePreview({ draft, text }: PreviewProps) {
  const spec = platformSpecs.youtube;
  const title = draft.youtubeTitle || draft.topic;
  return (
    <div className='bg-background text-sm'>
      <div className='relative'>
        <PreviewMedia media={draft.media} aspect={spec.aspect} />
        <span className='absolute right-2 bottom-2 rounded bg-black/80 px-1 text-[0.65rem] font-medium text-white'>
          0:00
        </span>
      </div>
      <div className='flex gap-3 p-3'>
        <AccountAvatar />
        <div className='min-w-0 flex-1'>
          <div className='line-clamp-2 font-semibold'>
            {title || <span className='text-muted-foreground italic'>Video title</span>}
          </div>
          <div className='text-muted-foreground text-xs'>{ACCOUNT.name} · 0 views · just now</div>
          <ExpandableText
            text={text}
            previewChars={spec.previewChars}
            className='text-muted-foreground mt-2 text-xs'
            placeholder='Description'
          />
        </div>
      </div>
    </div>
  );
}

export function TikTokPreview({ draft, text }: PreviewProps) {
  const spec = platformSpecs.tiktok;
  return (
    <div className='relative mx-auto max-w-[260px] overflow-hidden rounded-xl bg-black text-white'>
      <PreviewMedia media={draft.media} aspect={spec.aspect} className='bg-neutral-900' />
      <div className='absolute right-2 bottom-20 flex flex-col items-center gap-4'>
        <AccountAvatar className='size-9 ring-2 ring-white' />
        <Icons.heart className='size-6' />
        <Icons.messageDots className='size-6' />
        <Icons.bookmark className='size-6' />
        <Icons.share className='size-6' />
      </div>
      <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pr-14 text-xs'>
        <div className='font-semibold'>@{ACCOUNT.handle}</div>
        <ExpandableText
          text={text}
          previewChars={spec.previewChars}
          className='mt-1 text-white/90'
        />
        <div className='mt-1.5 flex items-center gap-1 text-white/80'>
          <Icons.music className='size-3' /> original sound · {ACCOUNT.name}
        </div>
      </div>
    </div>
  );
}

function LinkStrip({ link, title, cta }: { link: string; title: string; cta: string }) {
  return (
    <div className='bg-muted/60 flex items-center gap-3 px-3 py-2'>
      <div className='min-w-0 flex-1'>
        <div className='text-muted-foreground truncate text-xs uppercase'>{linkHost(link)}</div>
        <div className='truncate font-semibold'>{title || link}</div>
      </div>
      {cta && (
        <span className='bg-background shrink-0 rounded-md border px-3 py-1 text-xs font-medium'>
          {cta}
        </span>
      )}
    </div>
  );
}
