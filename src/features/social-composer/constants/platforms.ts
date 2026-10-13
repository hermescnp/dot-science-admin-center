import type { Icons } from '@/components/icons';

export const platformIds = ['instagram', 'facebook', 'linkedin', 'x', 'youtube', 'tiktok'] as const;
export type PlatformId = (typeof platformIds)[number];

export interface PlatformSpec {
  id: PlatformId;
  name: string;
  icon: keyof typeof Icons;
  /** Max characters for the post text (description on YouTube). */
  captionLimit: number;
  hashtagLimit?: number;
  /** Characters shown in the feed before "more". */
  previewChars?: number;
  /** CSS aspect-ratio of the feed media frame. */
  aspect: string;
  aspectLabel: string;
}

export const platformSpecs: Record<PlatformId, PlatformSpec> = {
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    captionLimit: 2200,
    hashtagLimit: 30,
    previewChars: 125,
    aspect: '4 / 5',
    aspectLabel: '4:5 portrait'
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    captionLimit: 63206,
    previewChars: 480,
    aspect: '1.91 / 1',
    aspectLabel: '1.91:1 landscape'
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    captionLimit: 3000,
    previewChars: 210,
    aspect: '1.91 / 1',
    aspectLabel: '1.91:1 landscape'
  },
  x: {
    id: 'x',
    name: 'X',
    icon: 'brandX',
    captionLimit: 280,
    aspect: '16 / 9',
    aspectLabel: '16:9 landscape'
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    captionLimit: 5000,
    hashtagLimit: 15,
    previewChars: 100,
    aspect: '16 / 9',
    aspectLabel: '16:9 video'
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'tiktok',
    captionLimit: 4000,
    previewChars: 100,
    aspect: '9 / 16',
    aspectLabel: '9:16 vertical'
  }
};

export const YOUTUBE_TITLE_LIMIT = 100;

export const objectives = [
  { value: 'awareness', label: 'Brand awareness' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'traffic', label: 'Website traffic' },
  { value: 'conversions', label: 'Sign-ups / conversions' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'event', label: 'Event promotion' }
] as const;

export const tones = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'inspiring', label: 'Inspiring' },
  { value: 'informative', label: 'Informative' },
  { value: 'playful', label: 'Playful' }
] as const;

export const ACCOUNT = { name: 'Dot Science', handle: 'dotscience', initials: 'DS' };
