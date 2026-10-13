'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
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

export function ImagePickerDialog({ open, onOpenChange, onSelect }: ImagePickerDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const images = useQuery({ ...knowledgeImagesQueryOptions(), enabled: open });

  function pick(image: PickedImage) {
    onSelect(image);
    onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Insert image</DialogTitle>
          <DialogDescription>
            Pick an image from the knowledge library, upload a new one, or link one by URL.
          </DialogDescription>
        </DialogHeader>

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
            <div className='text-muted-foreground flex h-full items-center justify-center gap-2'>
              <Icons.spinner className='size-4 animate-spin' /> Loading images…
            </div>
          ) : images.isError ? (
            <div className='text-muted-foreground flex h-full items-center justify-center'>
              Couldn&apos;t load the library.
            </div>
          ) : images.data.length === 0 ? (
            <div className='text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-center'>
              <Icons.photo className='size-8' />
              No images yet. Upload one to insert it into the layer.
            </div>
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
      </DialogContent>
    </Dialog>
  );
}
