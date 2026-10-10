import type { Database } from '@hermescnp/supabase';

export type WorkspaceRole = Database['public']['Enums']['workspace_role'];

export interface UserWorkspace {
  id: string;
  name: string;
  role: WorkspaceRole;
}

export interface UserActivity {
  documents: number;
  sessionsHosted: number;
  sessionsJoined: number;
  projects: number;
}

export interface PlatformUser {
  id: string;
  isSelf: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  locale: string;
  isPlatformAdmin: boolean;
  createdAt: string;
  email: string | null;
  emailVerified: boolean;
  providers: string[];
  lastSignInAt: string | null;
  /** Latest of sign-in, auth session refresh and IAteneo presence. */
  lastSeenAt: string | null;
  billingPlan: { id: string; name: string } | null;
  workspaces: UserWorkspace[];
  activity: UserActivity;
}

export const userSortKeys = ['name', 'email', 'created', 'last_sign_in', 'last_seen'] as const;
export type UserSortKey = (typeof userSortKeys)[number];

export interface UserFilters {
  page: number;
  limit: number;
  search?: string;
  admin?: boolean;
  plan?: string;
  /** `<key>.<asc|desc>` */
  sort?: `${UserSortKey}.${'asc' | 'desc'}`;
}

export interface UsersResponse {
  total: number;
  users: PlatformUser[];
}

export interface UserUpdatePayload {
  displayName: string;
  isPlatformAdmin: boolean;
  billingPlanId: string | null;
}
