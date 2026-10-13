import type { Icons } from '@/components/icons';
import type { AgoraItem, AgoraTab } from './agora-configs';

/** UI-only moderation layer: every value is derived from the item id so the dummy data is stable. */

export type ModerationStatus = 'active' | 'reported' | 'banned';
export type ModerationReason =
  | 'spam'
  | 'inappropriate'
  | 'copyright'
  | 'harassment'
  | 'misinformation'
  | 'other';
export type ItemVisibility = 'public' | 'private' | 'circle';
export type ModerationSort = 'newest' | 'oldest' | 'most-reported' | 'title';

type IconKey = keyof typeof Icons;

export interface ModerationUser {
  id: string;
  name: string;
  email: string;
}

export interface ItemReport {
  reason: ModerationReason;
  count: number;
}

export interface ItemBan {
  reason: ModerationReason;
  note: string;
  bannedAt: number;
}

export interface ModeratedItem extends AgoraItem {
  categoryId: string;
  categoryTitle: string;
  owner: ModerationUser;
  uploadedAt: number;
  visibility: ItemVisibility;
  reports: ItemReport[];
  status: ModerationStatus;
  ban?: ItemBan;
}

export type ModerationOverride = Pick<ModeratedItem, 'status' | 'reports' | 'ban'>;

export const DUMMY_USERS: ModerationUser[] = [
  { id: 'u-lucia', name: 'Lucía Ferrer', email: 'lucia.ferrer@aurora.org' },
  { id: 'u-daniel', name: 'Daniel Osei', email: 'daniel.osei@polislab.io' },
  { id: 'u-mei', name: 'Mei Tanaka', email: 'mei.tanaka@terra.org' },
  { id: 'u-tomas', name: 'Tomás Rivera', email: 'tomas@spatial.dev' },
  { id: 'u-aisha', name: 'Aisha Karim', email: 'aisha.karim@civic.tech' },
  { id: 'u-jonas', name: 'Jonas Weber', email: 'jonas.weber@design.systems' },
  { id: 'u-sofia', name: 'Sofía Navarro', email: 'sofia@stoanova.org' },
  { id: 'u-kofi', name: 'Kofi Mensah', email: 'kofi.mensah@mathplay.edu' },
  { id: 'u-hermes', name: 'Hermes Vargas', email: 'hermes@dotscience.ai' },
  { id: 'u-nina', name: 'Nina Petrova', email: 'nina.petrova@openproof.net' }
];

export const MODERATION_STATUSES: { value: ModerationStatus; label: string; icon: IconKey }[] = [
  { value: 'active', label: 'Active', icon: 'circleCheck' },
  { value: 'reported', label: 'Reported', icon: 'flag' },
  { value: 'banned', label: 'Banned', icon: 'gavel' }
];

export const BAN_REASONS: {
  value: ModerationReason;
  label: string;
  description: string;
  icon: IconKey;
}[] = [
  {
    value: 'spam',
    label: 'Spam',
    description: 'Ads, repeated posts or bot content',
    icon: 'mail'
  },
  {
    value: 'inappropriate',
    label: 'Inappropriate',
    description: 'Offensive, explicit or off-topic',
    icon: 'eyeOff'
  },
  {
    value: 'copyright',
    label: 'Copyright',
    description: 'Uses work without permission',
    icon: 'scale'
  },
  {
    value: 'harassment',
    label: 'Harassment',
    description: 'Targets or threatens a person',
    icon: 'warning'
  },
  {
    value: 'misinformation',
    label: 'Misinformation',
    description: 'Misleading or fabricated claims',
    icon: 'alertCircle'
  },
  { value: 'other', label: 'Other', description: 'Explain in the note', icon: 'dots' }
];

export const VISIBILITIES: { value: ItemVisibility; label: string; icon: IconKey }[] = [
  { value: 'public', label: 'Public', icon: 'globe' },
  { value: 'circle', label: 'Circle', icon: 'usersGroup' },
  { value: 'private', label: 'Private', icon: 'lock' }
];

export const SORT_OPTIONS: { value: ModerationSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most-reported', label: 'Most reported' },
  { value: 'title', label: 'Title A-Z' }
];

export const MIN_REPORT_OPTIONS = [0, 1, 3, 5] as const;

export function reasonLabel(reason: ModerationReason) {
  return BAN_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

export function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const DAY = 24 * 60 * 60 * 1000;
const REFERENCE_NOW = Date.UTC(2026, 9, 12);

function moderate(tabId: string, categoryId: string, categoryTitle: string, item: AgoraItem) {
  const id = `${tabId}:${item.id}`;
  const h = hash(id);
  const roll = h % 10;
  const status: ModerationStatus = roll === 0 ? 'banned' : roll <= 2 ? 'reported' : 'active';
  const reasonAt = (offset: number) => BAN_REASONS[(h >> offset) % BAN_REASONS.length].value;

  const reports: ItemReport[] =
    status === 'active'
      ? roll === 9
        ? [{ reason: reasonAt(2), count: 1 }]
        : []
      : [
          { reason: reasonAt(2), count: 1 + ((h >> 4) % 6) },
          ...(h % 3 === 0 ? [{ reason: reasonAt(7), count: 1 + ((h >> 9) % 3) }] : [])
        ].filter((r, i, all) => all.findIndex((o) => o.reason === r.reason) === i);

  const uploadedAt = REFERENCE_NOW - (h % 120) * DAY - ((h >> 5) % 24) * 60 * 60 * 1000;

  const moderated: ModeratedItem = {
    ...item,
    id,
    categoryId,
    categoryTitle,
    owner: DUMMY_USERS[(h >> 3) % DUMMY_USERS.length],
    uploadedAt,
    visibility: VISIBILITIES[(h >> 6) % VISIBILITIES.length].value,
    reports,
    status,
    ban:
      status === 'banned'
        ? {
            reason: reports[0].reason,
            note: 'Confirmed after review of the reports.',
            bannedAt: uploadedAt + DAY
          }
        : undefined
  };
  return moderated;
}

export function buildModeratedItems(tab: AgoraTab): ModeratedItem[] {
  return tab.categories.flatMap((category) =>
    category.items.map((item) => moderate(tab.id, category.id, category.title, item))
  );
}

export function reportCount(item: Pick<ModeratedItem, 'reports'>) {
  return item.reports.reduce((sum, report) => sum + report.count, 0);
}

export interface ModerationFilters {
  query: string;
  statuses: ModerationStatus[];
  reasons: ModerationReason[];
  owners: string[];
  visibilities: ItemVisibility[];
  categories: string[];
  minReports: number;
  uploadedFrom?: number;
  uploadedTo?: number;
  sort: ModerationSort;
}

export const EMPTY_FILTERS: ModerationFilters = {
  query: '',
  statuses: [],
  reasons: [],
  owners: [],
  visibilities: [],
  categories: [],
  minReports: 0,
  sort: 'newest'
};

export function activeFilterCount(filters: ModerationFilters) {
  return (
    (filters.query.trim() ? 1 : 0) +
    filters.statuses.length +
    filters.reasons.length +
    filters.owners.length +
    filters.visibilities.length +
    filters.categories.length +
    (filters.minReports > 0 ? 1 : 0) +
    (filters.uploadedFrom || filters.uploadedTo ? 1 : 0)
  );
}

export function applyFilters(items: ModeratedItem[], filters: ModerationFilters) {
  const needle = filters.query.trim().toLowerCase();
  const statuses = new Set(filters.statuses);
  const reasons = new Set(filters.reasons);
  const owners = new Set(filters.owners);
  const visibilities = new Set(filters.visibilities);
  const categories = new Set(filters.categories);
  const to = filters.uploadedTo ? filters.uploadedTo + DAY - 1 : undefined;

  const filtered = items.filter((item) => {
    if (statuses.size && !statuses.has(item.status)) return false;
    if (owners.size && !owners.has(item.owner.id)) return false;
    if (visibilities.size && !visibilities.has(item.visibility)) return false;
    if (categories.size && !categories.has(item.categoryId)) return false;
    if (reportCount(item) < filters.minReports) return false;
    if (filters.uploadedFrom && item.uploadedAt < filters.uploadedFrom) return false;
    if (to && item.uploadedAt > to) return false;
    if (
      reasons.size &&
      !(
        (item.ban && reasons.has(item.ban.reason)) ||
        item.reports.some((report) => reasons.has(report.reason))
      )
    ) {
      return false;
    }
    if (!needle) return true;
    return [item.title, item.subtitle, item.owner.name, item.owner.email].some((field) =>
      field.toLowerCase().includes(needle)
    );
  });

  return filtered.toSorted((a, b) => {
    switch (filters.sort) {
      case 'oldest':
        return a.uploadedAt - b.uploadedAt;
      case 'most-reported':
        return reportCount(b) - reportCount(a);
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return b.uploadedAt - a.uploadedAt;
    }
  });
}
