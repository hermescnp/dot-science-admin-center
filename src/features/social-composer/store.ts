import { create } from 'zustand';
import { platformIds, type PlatformId, objectives, tones } from './constants/platforms';

export interface ComposerMedia {
  id: string;
  url: string;
  kind: 'image' | 'video';
  name: string;
}

export interface ComposerDraft {
  objective: (typeof objectives)[number]['value'];
  tone: (typeof tones)[number]['value'];
  topic: string;
  keyMessage: string;
  audience: string;
  callToAction: string;
  link: string;
  caption: string;
  youtubeTitle: string;
  hashtags: string[];
  media: ComposerMedia[];
  scheduledAt: string;
  platforms: PlatformId[];
  overrides: Partial<Record<PlatformId, string>>;
}

type EditableField =
  | 'objective'
  | 'tone'
  | 'topic'
  | 'keyMessage'
  | 'audience'
  | 'callToAction'
  | 'link'
  | 'caption'
  | 'youtubeTitle'
  | 'scheduledAt';

interface ComposerState {
  draft: ComposerDraft;
  setField: <K extends EditableField>(field: K, value: ComposerDraft[K]) => void;
  togglePlatform: (id: PlatformId) => void;
  setOverride: (id: PlatformId, text: string | null) => void;
  addHashtag: (tag: string) => void;
  removeHashtag: (tag: string) => void;
  addMedia: (files: File[]) => void;
  removeMedia: (id: string) => void;
  reset: () => void;
}

const initialDraft: ComposerDraft = {
  objective: 'awareness',
  tone: 'professional',
  topic: '',
  keyMessage: '',
  audience: '',
  callToAction: '',
  link: '',
  caption: '',
  youtubeTitle: '',
  hashtags: [],
  media: [],
  scheduledAt: '',
  platforms: [...platformIds],
  overrides: {}
};

export function normalizeHashtag(tag: string) {
  return tag.trim().replace(/^#+/, '').replace(/\s+/g, '');
}

export const useComposerStore = create<ComposerState>()((set, get) => ({
  draft: initialDraft,

  setField: (field, value) => set((s) => ({ draft: { ...s.draft, [field]: value } })),

  togglePlatform: (id) =>
    set((s) => {
      const selected = s.draft.platforms.includes(id);
      const platforms = selected
        ? s.draft.platforms.filter((p) => p !== id)
        : platformIds.filter((p) => p === id || s.draft.platforms.includes(p));
      return { draft: { ...s.draft, platforms } };
    }),

  setOverride: (id, text) =>
    set((s) => {
      const overrides = { ...s.draft.overrides };
      if (text === null) delete overrides[id];
      else overrides[id] = text;
      return { draft: { ...s.draft, overrides } };
    }),

  addHashtag: (tag) =>
    set((s) => {
      const clean = normalizeHashtag(tag);
      if (!clean || s.draft.hashtags.some((t) => t.toLowerCase() === clean.toLowerCase())) return s;
      return { draft: { ...s.draft, hashtags: [...s.draft.hashtags, clean] } };
    }),

  removeHashtag: (tag) =>
    set((s) => ({ draft: { ...s.draft, hashtags: s.draft.hashtags.filter((t) => t !== tag) } })),

  addMedia: (files) =>
    set((s) => {
      const added = files
        .filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'))
        .map<ComposerMedia>((file) => ({
          id: crypto.randomUUID(),
          url: URL.createObjectURL(file),
          kind: file.type.startsWith('video/') ? 'video' : 'image',
          name: file.name
        }));
      return { draft: { ...s.draft, media: [...s.draft.media, ...added] } };
    }),

  removeMedia: (id) =>
    set((s) => {
      const item = s.draft.media.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return { draft: { ...s.draft, media: s.draft.media.filter((m) => m.id !== id) } };
    }),

  reset: () => {
    get().draft.media.forEach((m) => URL.revokeObjectURL(m.url));
    set({ draft: initialDraft });
  }
}));

/** Text published on a platform: its override (or the main caption) followed by the hashtags. */
export function postTextFor(draft: ComposerDraft, platform: PlatformId) {
  const body = (draft.overrides[platform] ?? draft.caption).trim();
  const tags = draft.hashtags.map((t) => `#${t}`).join(' ');
  return [body, tags].filter(Boolean).join('\n\n');
}
