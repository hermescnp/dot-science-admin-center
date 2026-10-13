'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { removeDepartmentImageMutation, uploadDepartmentImageMutation } from '../api/mutations';
import type { Department } from '../api/types';
import { ZoneImage } from './zone-image';

export function DepartmentImage({ department }: { department: Department }) {
  const uploadMutation = useMutation({
    ...uploadDepartmentImageMutation,
    onSuccess: (...args) => {
      uploadDepartmentImageMutation.onSuccess?.(...args);
      toast.success('Image updated');
    },
    onError: () => toast.error("Couldn't upload the image. Try again.")
  });

  const removeMutation = useMutation({
    ...removeDepartmentImageMutation,
    onSuccess: (...args) => {
      removeDepartmentImageMutation.onSuccess?.(...args);
      toast.success('Image removed');
    },
    onError: () => toast.error("Couldn't remove the image")
  });

  return (
    <ZoneImage
      imageUrl={department.imageUrl}
      alt={department.name}
      zoneKey={department.zoneKey}
      onUpload={(file) => uploadMutation.mutate({ id: department.id, file })}
      uploading={uploadMutation.isPending}
      onRemove={() => removeMutation.mutate(department.id)}
      removing={removeMutation.isPending}
    />
  );
}
