import { apiClient } from '@/lib/api-client';
import type {
  Department,
  DepartmentMemberPayload,
  DepartmentPayload,
  OrgProfile,
  OrgProfilePayload
} from './types';

const departmentPath = (id: string) => `/org-structure/departments/${encodeURIComponent(id)}`;

export async function getDepartments(): Promise<Department[]> {
  const { departments } = await apiClient<{ departments: Department[] }>(
    '/org-structure/departments',
    { cache: 'no-store' }
  );
  return departments;
}

export async function createDepartment(data: DepartmentPayload) {
  return apiClient<{ ok: true }>('/org-structure/departments', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateDepartment(id: string, data: DepartmentPayload) {
  return apiClient<{ ok: true }>(departmentPath(id), {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteDepartment(id: string) {
  return apiClient<{ ok: true }>(departmentPath(id), { method: 'DELETE' });
}

function postImage(endpoint: string, file: File) {
  const body = new FormData();
  body.append('file', file);
  // Empty headers let the browser set the multipart boundary.
  return apiClient<{ ok: true }>(endpoint, { method: 'POST', headers: {}, body });
}

export async function uploadDepartmentImage(id: string, file: File) {
  return postImage(`${departmentPath(id)}/image`, file);
}

export async function removeDepartmentImage(id: string) {
  return apiClient<{ ok: true }>(`${departmentPath(id)}/image`, { method: 'DELETE' });
}

export async function getOrgProfile(): Promise<OrgProfile> {
  const { organization } = await apiClient<{ organization: OrgProfile }>(
    '/org-structure/organization',
    { cache: 'no-store' }
  );
  return organization;
}

export async function updateOrgProfile(data: OrgProfilePayload) {
  return apiClient<{ ok: true }>('/org-structure/organization', {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function uploadOrgProfileImage(file: File) {
  return postImage('/org-structure/organization/image', file);
}

export async function removeOrgProfileImage() {
  return apiClient<{ ok: true }>('/org-structure/organization/image', { method: 'DELETE' });
}

export async function addDepartmentMember(departmentId: string, data: DepartmentMemberPayload) {
  return apiClient<{ ok: true }>(`${departmentPath(departmentId)}/members`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function removeDepartmentMember(departmentId: string, memberId: string) {
  return apiClient<{ ok: true }>(
    `${departmentPath(departmentId)}/members/${encodeURIComponent(memberId)}`,
    { method: 'DELETE' }
  );
}
