'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  designComponentsQueryOptions,
  designSectionsQueryOptions
} from '@/features/design-board/api/queries';
import { ComponentPreviewEmbed } from '@/features/design-board/components/embeds/component-preview-embed';
import { FrameEmbed } from '@/features/design-board/components/embeds/frame-embed';
import { componentRef, frameRef } from '@/features/design-board/lib/design-refs';
import { sectionFrames } from '@/features/design-board/lib/section-frames';
import { knowledgeBaseKeys, knowledgeImagesQueryOptions } from '../api/queries';
import { uploadKnowledgeImage } from '../api/service';
import { KNOWLEDGE_IMAGE_TYPES, type KnowledgeImage } from '../api/types';

export interface PickedImage {
  url: string;
  alt: string;
}

interface ImagePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (image: PickedImage) => void;
}

const ACCEPT = Object.keys(KNOWLEDGE_IMAGE_TYPES).join(',');

/** Height of a design thumbnail in the picker grids. */
const THUMBNAIL_HEIGHT = 112;

export function ImagePickerDialog({ open, onOpenChange, onSelect }: ImagePickerDialogProps) {
  function pick(image: PickedImage) {
    onSelect(image);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Insert image</DialogTitle>
          <DialogDescription>
            Pick an uploaded image, or a component preview or frame from Design. Design embeds stay
            live: they always show the current design.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue='uploaded' className='min-w-0'>
          <TabsList className='w-full'>
            <TabsTrigger value='uploaded'>
              <Icons.photo /> Uploaded images
            </TabsTrigger>
            <TabsTrigger value='components'>
              <Icons.component /> Component previews
            </TabsTrigger>
            <TabsTrigger value='frames'>
              <Icons.layoutBoardSplit /> Frames
            </TabsTrigger>
          </TabsList>
          <TabsContent value='uploaded' className='flex flex-col gap-4'>
            <UploadedImagesTab open={open} onPick={pick} />
          </TabsContent>
          <TabsContent value='components'>
            <ComponentPreviewsTab onPick={pick} />
          </TabsContent>
          <TabsContent value='frames'>
            <FramesTab onPick={pick} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface TabProps {
  onPick: (image: PickedImage) => void;
}

function PickerMessage({ children }: { children: ReactNode }) {
  return (
    <div className='text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-center'>
      {children}
    </div>
  );
}

function PickerLoading({ label }: { label: string }) {
  return (
    <PickerMessage>
      <span className='flex items-center gap-2'>
        <Icons.spinner className='size-4 animate-spin' /> {label}
      </span>
    </PickerMessage>
  );
}

interface DesignCardProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
}

/** A pickable design thumbnail; the embed inside is inert, so a click always picks it. */
function DesignCard({ label, onClick, children }: DesignCardProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='group hover:border-primary flex min-w-0 flex-col overflow-hidden rounded-lg border text-left transition-colors'
    >
      <div
        inert
        className='bg-muted/40 flex items-center justify-center overflow-hidden p-2'
        style={{ height: THUMBNAIL_HEIGHT + 16 }}
      >
        {children}
      </div>
      <p className='truncate border-t px-2 py-1.5 text-xs' title={label}>
        {label}
      </p>
    </button>
  );
}

function UploadedImagesTab({ open, onPick }: TabProps & { open: boolean }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const images = useQuery({ ...knowledgeImagesQueryOptions(), enabled: open });

  function pick(image: PickedImage) {
    onPick(image);
    setUrl('');
  }

  const upload = useMutation({
    mutationFn: uploadKnowledgeImage,
    onSuccess: (image) => {
      queryClient.setQueryData<KnowledgeImage[]>(knowledgeBaseKeys.images(), (current) => [
        image,
        ...(current ?? [])
      ]);
      pick(image);
    },
    onError: () => toast.error("Couldn't upload the image")
  });

  function insertUrl() {
    const trimmed = url.trim();
    if (!/^https?:\/\/\S+$/.test(trimmed)) {
      toast.error('Enter an image URL starting with http:// or https://');
      return;
    }
    const alt = decodeURIComponent(trimmed.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
    pick({ url: trimmed, alt });
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type='file'
        accept={ACCEPT}
        className='hidden'
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) upload.mutate(file);
        }}
      />

      <div className='flex items-center justify-between gap-2'>
        <p className='text-muted-foreground'>
          {images.data
            ? `${images.data.length} image${images.data.length === 1 ? '' : 's'} in the library`
            : 'Knowledge library'}
        </p>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={upload.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {upload.isPending ? <Icons.spinner className='animate-spin' /> : <Icons.upload />}
          {upload.isPending ? 'Uploading…' : 'Upload image'}
        </Button>
      </div>

      <div className='h-72 overflow-y-auto rounded-lg border p-3'>
        {images.isPending ? (
          <PickerLoading label='Loading images…' />
        ) : images.isError ? (
          <PickerMessage>Couldn&apos;t load the library.</PickerMessage>
        ) : images.data.length === 0 ? (
          <PickerMessage>
            <Icons.photo className='size-8' />
            No images yet. Upload one to insert it into the layer.
          </PickerMessage>
        ) : (
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            {images.data.map((image) => (
              <button
                key={image.name}
                type='button'
                onClick={() => pick(image)}
                className='group hover:border-primary flex flex-col overflow-hidden rounded-lg border text-left transition-colors'
              >
                <div className='bg-muted/40 aspect-[4/3]'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.alt} className='size-full object-cover' />
                </div>
                <p className='truncate px-2 py-1.5 text-xs' title={image.alt}>
                  {image.alt}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className='flex gap-2'>
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              insertUrl();
            }
          }}
          placeholder='https://example.com/diagram.png'
          aria-label='Image URL'
        />
        <Button type='button' variant='secondary' disabled={!url.trim()} onClick={insertUrl}>
          Insert URL
        </Button>
      </div>
    </>
  );
}

function ComponentPreviewsTab({ onPick }: TabProps) {
  const components = useQuery(designComponentsQueryOptions());
  const sorted = useMemo(
    () => components.data?.toSorted((a, b) => a.name.localeCompare(b.name)) ?? [],
    [components.data]
  );

  return (
    <div className='h-[26rem] overflow-y-auto rounded-lg border p-3'>
      {components.isPending ? (
        <PickerLoading label='Loading components…' />
      ) : components.isError ? (
        <PickerMessage>Couldn&apos;t load the components.</PickerMessage>
      ) : sorted.length === 0 ? (
        <PickerMessage>
          <Icons.component className='size-8' />
          No components yet. Make an element reusable in Design to add one.
        </PickerMessage>
      ) : (
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
          {sorted.map((component) => (
            <DesignCard
              key={component.id}
              label={component.name}
              onClick={() => onPick({ url: componentRef(component.id), alt: component.name })}
            >
              <ComponentPreviewEmbed componentId={component.id} className='w-full self-start' />
            </DesignCard>
          ))}
        </div>
      )}
    </div>
  );
}

function FramesTab({ onPick }: TabProps) {
  const sections = useQuery(designSectionsQueryOptions());
  const groups = useMemo(
    () =>
      (sections.data ?? [])
        .map((section) => ({ section, frames: sectionFrames(section) }))
        .filter(({ frames }) => frames.length > 0),
    [sections.data]
  );

  return (
    <div className='h-[26rem] overflow-y-auto rounded-lg border p-3'>
      {sections.isPending ? (
        <PickerLoading label='Loading frames…' />
      ) : sections.isError ? (
        <PickerMessage>Couldn&apos;t load the design sections.</PickerMessage>
      ) : groups.length === 0 ? (
        <PickerMessage>
          <Icons.layoutBoardSplit className='size-8' />
          No frames yet. Draw a frame on a Design canvas to add one.
        </PickerMessage>
      ) : (
        <div className='flex flex-col gap-4'>
          {groups.map(({ section, frames }) => (
            <section key={section.id} className='flex flex-col gap-2'>
              <h3 className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                {section.title}
              </h3>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                {frames.map((frame) => (
                  <DesignCard
                    key={frame.frameId}
                    label={frame.label}
                    onClick={() =>
                      onPick({ url: frameRef(frame.sectionId, frame.frameId), alt: frame.label })
                    }
                  >
                    <FrameEmbed
                      sectionId={frame.sectionId}
                      frameId={frame.frameId}
                      maxHeight={THUMBNAIL_HEIGHT}
                    />
                  </DesignCard>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
