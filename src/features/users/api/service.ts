import { apiClient } from '@/lib/api-client';
import type { PlatformUser, UserFilters, UserUpdatePayload, UsersResponse } from './types';

export async function getUsers(filters: UserFilters): Promise<UsersResponse> {
  const params = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) });
  if (filters.search) params.set('search', filters.search);
  if (filters.admin !== undefined) params.set('admin', String(filters.admin));
  if (filters.plan) params.set('plan', filters.plan);
  if (filters.sort) params.set('sort', filters.sort);
  return apiClient<UsersResponse>(`/users?${params}`, { cache: 'no-store' });
}

export async function updateUser(id: string, data: UserUpdatePayload) {
  return apiClient<PlatformUser>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}
