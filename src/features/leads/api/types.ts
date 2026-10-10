export const leadStatuses = ['new', 'contacted', 'qualified', 'converted', 'discarded'] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const leadSources = ['iateneo_guest', 'iateneo_invited'] as const;
export type LeadSource = (typeof leadSources)[number];

export const leadEmailStatuses = ['verified', 'pending', 'failed', 'unverified'] as const;
export type LeadEmailStatus = (typeof leadEmailStatuses)[number];

export interface LeadSession {
  id: string;
  name: string | null;
  code: string;
  date: string;
  role: 'guest' | 'invited';
  openedAt: string | null;
}

export interface Lead {
  id: string;
  email: string;
  name: string | null;
  source: LeadSource;
  status: LeadStatus;
  notes: string;
  firstCapturedAt: string;
  lastCapturedAt: string;
  emailStatus: LeadEmailStatus;
  emailVerifiedAt: string | null;
  sessions: LeadSession[];
}

export const leadSortKeys = [
  'name',
  'email',
  'status',
  'verified',
  'first_captured',
  'last_captured'
] as const;
export type LeadSortKey = (typeof leadSortKeys)[number];

export interface LeadFilters {
  page: number;
  limit: number;
  search?: string;
  statuses?: LeadStatus[];
  sources?: LeadSource[];
  emailStatuses?: LeadEmailStatus[];
  /** `<key>.<asc|desc>` */
  sort?: `${LeadSortKey}.${'asc' | 'desc'}`;
}

export interface LeadsResponse {
  total: number;
  leads: Lead[];
}

export interface LeadUpdatePayload {
  status: LeadStatus;
  notes: string;
}
