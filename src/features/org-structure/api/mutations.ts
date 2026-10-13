import { mutationOptions } from '@tanstack/react-query';
import { virtualOfficeKeys } from '@/features/virtual-office/api/queries';
import { getQueryClient } from '@/lib/query-client';
import { orgStructureKeys } from './queries';
import {
  addDepartmentMember,
  createDepartment,
  deleteDepartment,
  removeDepartmentImage,
  removeDepartmentMember,
  removeOrgProfileImage,
  updateDepartment,
  updateOrgProfile,
  uploadDepartmentImage,
  uploadOrgProfileImage
} from './service';
import type { DepartmentMemberPayload, DepartmentPayload, OrgProfilePayload } from './types';

// Departments drive the virtual office zone names and documentation.
const invalidate = () => {
  const queryClient = getQueryClient();
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: orgStructureKeys.all }),
    queryClient.invalidateQueries({ queryKey: virtualOfficeKeys.all })
  ]);
};

export const createDepartmentMutation = mutationOptions({
  mutationFn: (data: DepartmentPayload) => createDepartment(data),
  onSuccess: invalidate
});

export const updateDepartmentMutation = mutationOptions({
  mutationFn: ({ id, values }: { id: string; values: DepartmentPayload }) =>
    updateDepartment(id, values),
  onSuccess: invalidate
});

export const deleteDepartmentMutation = mutationOptions({
  mutationFn: (id: string) => deleteDepartment(id),
  onSuccess: invalidate
});

export const uploadDepartmentImageMutation = mutationOptions({
  mutationFn: ({ id, file }: { id: string; file: File }) => uploadDepartmentImage(id, file),
  onSuccess: invalidate
});

export const removeDepartmentImageMutation = mutationOptions({
  mutationFn: (id: string) => removeDepartmentImage(id),
  onSuccess: invalidate
});

export const updateOrgProfileMutation = mutationOptions({
  mutationFn: (data: OrgProfilePayload) => updateOrgProfile(data),
  onSuccess: invalidate
});

export const uploadOrgProfileImageMutation = mutationOptions({
  mutationFn: (file: File) => uploadOrgProfileImage(file),
  onSuccess: invalidate
});

export const removeOrgProfileImageMutation = mutationOptions({
  mutationFn: () => removeOrgProfileImage(),
  onSuccess: invalidate
});

export const addDepartmentMemberMutation = mutationOptions({
  mutationFn: ({
    departmentId,
    values
  }: {
    departmentId: string;
    values: DepartmentMemberPayload;
  }) => addDepartmentMember(departmentId, values),
  onSuccess: invalidate
});

export const removeDepartmentMemberMutation = mutationOptions({
  mutationFn: ({ departmentId, memberId }: { departmentId: string; memberId: string }) =>
    removeDepartmentMember(departmentId, memberId),
  onSuccess: invalidate
});
