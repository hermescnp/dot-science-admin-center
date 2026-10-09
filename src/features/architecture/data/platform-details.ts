export type PlatformSectionId = 'create' | 'agora' | 'studio' | 'about';

export type PlatformSection = { path: string } | { unavailable: string };

export type PlatformSections = Record<PlatformSectionId, PlatformSection>;

export const platformSectionOrder: { id: PlatformSectionId; label: string }[] = [
  { id: 'create', label: 'Create' },
  { id: 'agora', label: 'Agora' },
  { id: 'studio', label: 'Studio' },
  { id: 'about', label: 'About' }
];

export function sectionUrl(
  section: PlatformSection,
  platformUrl: string | undefined
): string | null {
  return 'path' in section && platformUrl ? new URL(section.path, platformUrl).toString() : null;
}

const notAvailable: PlatformSection = { unavailable: 'Not available yet' };

/** Where each platform's sections live; their functionalities are stored in `platform_features`. */
export const platformSections: Record<string, PlatformSections> = {
  'dot-science-ai': {
    create: { path: '/' },
    agora: notAvailable,
    studio: notAvailable,
    about: { path: '/about' }
  },
  workspace: {
    create: { path: '/' },
    agora: notAvailable,
    studio: notAvailable,
    about: notAvailable
  },
  iateneo: {
    create: { path: '/' },
    agora: { path: '/agora' },
    studio: { unavailable: 'Studio runs inside a live session (opened from Create)' },
    about: { path: '/about' }
  },
  'golden-papers': {
    create: { path: '/' },
    agora: { path: '/agora' },
    studio: { path: '/studio' },
    about: { path: '/about' }
  },
  'abstra-space': {
    create: { path: '/' },
    agora: { path: '/agora' },
    studio: { path: '/studio' },
    about: notAvailable
  },
  'admin-center': {
    create: { path: '/' },
    agora: notAvailable,
    studio: notAvailable,
    about: notAvailable
  },
  'affine-club': {
    create: notAvailable,
    agora: notAvailable,
    studio: notAvailable,
    about: notAvailable
  }
};
