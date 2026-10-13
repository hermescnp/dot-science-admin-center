'use client';

import { useRef, useState } from 'react';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  objectives,
  platformIds,
  platformSpecs,
  tones,
  YOUTUBE_TITLE_LIMIT,
  type PlatformId
} from '../constants/platforms';
import { postTextFor, useComposerStore } from '../store';

export function PublicationBrief() {
  return (
    <div className='flex flex-col gap-4'>
      <BriefCard />
      <ContentCard />
      <PlatformsCard />
    </div>
  );
}

function BriefCard() {
  const draft = useComposerStore((s) => s.draft);
  const setField = useComposerStore((s) => s.setField);

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Publication brief</CardTitle>
        <CardDescription>
          The core of the publication. The AI assistant will use it to draft each platform&apos;s
          copy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className='grid gap-4 sm:grid-cols-2'>
          <Field>
            <FieldLabel htmlFor='brief-objective'>Objective</FieldLabel>
            <NativeSelect
              id='brief-objective'
              value={draft.objective}
              onChange={(e) =>
                setField('objective', e.target.value as (typeof objectives)[number]['value'])
              }
            >
              {objectives.map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor='brief-tone'>Tone</FieldLabel>
            <NativeSelect
              id='brief-tone'
              value={draft.tone}
              onChange={(e) => setField('tone', e.target.value as (typeof tones)[number]['value'])}
            >
              {tones.map((t) => (
                <NativeSelectOption key={t.value} value={t.value}>
                  {t.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field className='sm:col-span-2'>
            <FieldLabel htmlFor='brief-topic'>Topic</FieldLabel>
            <Input
              id='brief-topic'
              placeholder='e.g. Launch of the IAteneo explore mode'
              value={draft.topic}
              onChange={(e) => setField('topic', e.target.value)}
            />
          </Field>
          <Field className='sm:col-span-2'>
            <FieldLabel htmlFor='brief-message'>Key message</FieldLabel>
            <Textarea
              id='brief-message'
              rows={2}
              placeholder='The one idea readers should remember'
              value={draft.keyMessage}
              onChange={(e) => setField('keyMessage', e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor='brief-audience'>Audience</FieldLabel>
            <Input
              id='brief-audience'
              placeholder='e.g. Researchers and educators'
              value={draft.audience}
              onChange={(e) => setField('audience', e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor='brief-cta'>Call to action</FieldLabel>
            <Input
              id='brief-cta'
              placeholder='e.g. Learn more'
              value={draft.callToAction}
              onChange={(e) => setField('callToAction', e.target.value)}
            />
          </Field>
          <Field className='sm:col-span-2'>
            <FieldLabel htmlFor='brief-link'>Link</FieldLabel>
            <Input
              id='brief-link'
              type='url'
              placeholder='https://dotscience.ai/...'
              value={draft.link}
              onChange={(e) => setField('link', e.target.value)}
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function ContentCard() {
  const caption = useComposerStore((s) => s.draft.caption);
  const youtubeTitle = useComposerStore((s) => s.draft.youtubeTitle);
  const platforms = useComposerStore((s) => s.draft.platforms);
  const setField = useComposerStore((s) => s.setField);
  const strictest = platforms.reduce<number | null>(
    (min, id) => Math.min(min ?? Infinity, platformSpecs[id].captionLimit),
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Content</CardTitle>
        <CardDescription>Shared copy and media for every selected platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className='gap-4'>
          <Field>
            <div className='flex items-center justify-between'>
              <FieldLabel htmlFor='content-caption'>Caption</FieldLabel>
              {strictest !== null && (
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    caption.length > strictest ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {caption.length} / {strictest}
                </span>
              )}
            </div>
            <Textarea
              id='content-caption'
              rows={6}
              placeholder='Write the post, or let the AI assistant draft it from the brief'
              value={caption}
              onChange={(e) => setField('caption', e.target.value)}
            />
            <FieldDescription>
              Counter shows the strictest limit among selected platforms.
            </FieldDescription>
          </Field>
          {platforms.includes('youtube') && (
            <Field>
              <div className='flex items-center justify-between'>
                <FieldLabel htmlFor='content-yt-title'>YouTube title</FieldLabel>
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    youtubeTitle.length > YOUTUBE_TITLE_LIMIT
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  )}
                >
                  {youtubeTitle.length} / {YOUTUBE_TITLE_LIMIT}
                </span>
              </div>
              <Input
                id='content-yt-title'
                placeholder='Video title'
                value={youtubeTitle}
                onChange={(e) => setField('youtubeTitle', e.target.value)}
              />
            </Field>
          )}
          <HashtagField />
          <MediaField />
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function HashtagField() {
  const hashtags = useComposerStore((s) => s.draft.hashtags);
  const addHashtag = useComposerStore((s) => s.addHashtag);
  const removeHashtag = useComposerStore((s) => s.removeHashtag);
  const [value, setValue] = useState('');

  function commit() {
    value.split(/[\s,]+/).forEach(addHashtag);
    setValue('');
  }

  return (
    <Field>
      <FieldLabel htmlFor='content-hashtags'>Hashtags</FieldLabel>
      <div className='border-input focus-within:ring-ring/50 focus-within:border-ring flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 focus-within:ring-[3px]'>
        {hashtags.map((tag) => (
          <Badge key={tag} variant='secondary' className='gap-1 pr-1'>
            #{tag}
            <button
              type='button'
              aria-label={`Remove #${tag}`}
              className='hover:text-foreground text-muted-foreground rounded-sm'
              onClick={() => removeHashtag(tag)}
            >
              <Icons.close className='size-3' />
            </button>
          </Badge>
        ))}
        <input
          id='content-hashtags'
          className='placeholder:text-muted-foreground min-w-24 flex-1 bg-transparent text-sm outline-none'
          placeholder={hashtags.length ? '' : 'Type a tag and press Enter'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && !value && hashtags.length) {
              removeHashtag(hashtags[hashtags.length - 1]);
            }
          }}
        />
      </div>
    </Field>
  );
}

function MediaField() {
  const media = useComposerStore((s) => s.draft.media);
  const addMedia = useComposerStore((s) => s.addMedia);
  const removeMedia = useComposerStore((s) => s.removeMedia);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Field>
      <FieldLabel>Media</FieldLabel>
      <div className='flex flex-wrap gap-2'>
        {media.map((item) => (
          <div key={item.id} className='group relative size-20 overflow-hidden rounded-md border'>
            {item.kind === 'video' ? (
              <video src={item.url} className='size-full object-cover' muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={item.url} alt={item.name} className='size-full object-cover' />
            )}
            <button
              type='button'
              aria-label={`Remove ${item.name}`}
              className='bg-background/80 absolute top-1 right-1 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100'
              onClick={() => removeMedia(item.id)}
            >
              <Icons.close className='size-3.5' />
            </button>
          </div>
        ))}
        <button
          type='button'
          onClick={() => inputRef.current?.click()}
          className='text-muted-foreground hover:bg-muted/50 flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs'
        >
          <Icons.upload className='size-4' />
          Add
        </button>
        <input
          ref={inputRef}
          type='file'
          accept='image/*,video/*'
          multiple
          className='hidden'
          onChange={(e) => {
            addMedia(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </div>
      <FieldDescription>
        Images and videos stay in this browser; nothing is uploaded.
      </FieldDescription>
    </Field>
  );
}

function PlatformsCard() {
  const draft = useComposerStore((s) => s.draft);
  const setField = useComposerStore((s) => s.setField);

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Platforms &amp; schedule</CardTitle>
        <CardDescription>Choose where it goes and adapt the copy per platform.</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <div className='divide-y rounded-md border'>
          {platformIds.map((id) => (
            <PlatformRow key={id} id={id} />
          ))}
        </div>
        <Field className='max-w-xs'>
          <FieldLabel htmlFor='schedule-at'>Planned publish time</FieldLabel>
          <Input
            id='schedule-at'
            type='datetime-local'
            value={draft.scheduledAt}
            onChange={(e) => setField('scheduledAt', e.target.value)}
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function PlatformRow({ id }: { id: PlatformId }) {
  const spec = platformSpecs[id];
  const Icon = Icons[spec.icon];
  const draft = useComposerStore((s) => s.draft);
  const togglePlatform = useComposerStore((s) => s.togglePlatform);
  const setOverride = useComposerStore((s) => s.setOverride);
  const selected = draft.platforms.includes(id);
  const override = draft.overrides[id];
  const length = postTextFor(draft, id).length;

  return (
    <div className='flex flex-col gap-2 p-3'>
      <div className='flex items-center gap-3'>
        <Switch
          checked={selected}
          onCheckedChange={() => togglePlatform(id)}
          aria-label={`Publish on ${spec.name}`}
        />
        <Icon className='size-4' />
        <span className='text-sm font-medium'>{spec.name}</span>
        <span className='text-muted-foreground hidden text-xs sm:inline'>{spec.aspectLabel}</span>
        {selected && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='ml-auto h-7 text-xs'
            onClick={() => setOverride(id, override === undefined ? draft.caption : null)}
          >
            {override === undefined ? 'Customize copy' : 'Use shared caption'}
          </Button>
        )}
      </div>
      {selected && override !== undefined && (
        <div className='flex flex-col gap-1'>
          <Textarea
            rows={4}
            aria-label={`${spec.name} copy`}
            value={override}
            onChange={(e) => setOverride(id, e.target.value)}
          />
          <span
            className={cn(
              'self-end text-xs tabular-nums',
              length > spec.captionLimit ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {length} / {spec.captionLimit} with hashtags
          </span>
        </div>
      )}
    </div>
  );
}
