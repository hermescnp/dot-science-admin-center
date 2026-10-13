'use client';

import { useRef } from 'react';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { FieldDescription, FieldLabel } from '@/components/ui/field';
import { LoadingButton } from '@/components/ui/loading-button';
import { DEPARTMENT_IMAGE_MAX_BYTES, DEPARTMENT_IMAGE_TYPES } from '../schemas/department';

interface ZoneImageProps {
  imageUrl: string | null;
  alt: string;
  /** Virtual office zone the image is shown in. */
  zoneKey: string | null;
  onUpload: (file: File) => void;
  uploading: boolean;
  onRemove: () => void;
  removing: boolean;
}

export function ZoneImage({
  imageUrl,
  alt,
  zoneKey,
  onUpload,
  uploading,
  onRemove,
  removing
}: ZoneImageProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!DEPARTMENT_IMAGE_TYPES.includes(file.type)) {
      toast.error('Use a PNG, JPEG, WebP or SVG image.');
      return;
    }
    if (file.size > DEPARTMENT_IMAGE_MAX_BYTES) {
      toast.error('The image must be 5 MB or smaller.');
      return;
    }
    onUpload(file);
  }

  return (
    <div className='space-y-3'>
      <FieldLabel>Image</FieldLabel>
      <div className='flex items-center gap-4'>
        <div className='bg-muted/40 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border'>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={alt} className='size-full object-contain p-1.5' />
          ) : (
            <Icons.media className='text-muted-foreground size-6' stroke={1.5} />
          )}
        </div>
        <div className='flex flex-col items-start gap-2'>
          <LoadingButton
            type='button'
            variant='outline'
            size='sm'
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Icons.upload className='mr-1 h-4 w-4' />
            {imageUrl ? 'Replace' : 'Upload'}
          </LoadingButton>
          {imageUrl ? (
            <Button type='button' variant='ghost' size='sm' disabled={removing} onClick={onRemove}>
              <Icons.trash className='mr-1 h-4 w-4' /> Remove
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type='file'
          accept={DEPARTMENT_IMAGE_TYPES.join(',')}
          className='hidden'
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
      <FieldDescription>
        {zoneKey
          ? `Shown with the description in the virtual office (${zoneKey} zone).`
          : 'Not linked to a virtual office zone.'}
      </FieldDescription>
    </div>
  );
}
