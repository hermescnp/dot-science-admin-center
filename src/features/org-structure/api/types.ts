export type DepartmentMemberKind = 'user' | 'agent';

export interface DepartmentMember {
  id: string;
  kind: DepartmentMemberKind;
  /** Profile user id or platform agent id. */
  refId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  /** Markdown shown as the zone documentation in the virtual office. */
  longDescription: string;
  /** Public URL or a static `/virtual-office/...` path. */
  imageUrl: string | null;
  /** Virtual office zone this department drives, if any. */
  zoneKey: string | null;
  /** Null when the department reports directly to Dot Science. */
  parentId: string | null;
  position: number;
  members: DepartmentMember[];
}

export interface DepartmentPayload {
  name: string;
  description: string;
  longDescription: string;
  parentId: string | null;
}

/** Dot Science itself: the root of the chart and the virtual office main space. */
export interface OrgProfile {
  longDescription: string;
  imageUrl: string | null;
  zoneKey: string | null;
}

export interface OrgProfilePayload {
  longDescription: string;
}

export interface DepartmentMemberPayload {
  kind: DepartmentMemberKind;
  refId: string;
  role: string;
}
