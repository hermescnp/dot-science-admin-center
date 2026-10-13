'use client';

import { createContext, use } from 'react';

export interface ModerationContextValue {
  state: {
    selectedIds: ReadonlySet<string>;
  };
  actions: {
    toggleSelected: (id: string) => void;
    viewDetails: (id: string) => void;
    ban: (ids: string[]) => void;
    restore: (ids: string[]) => void;
    dismissReports: (ids: string[]) => void;
    copyId: (id: string) => void;
  };
}

export const ModerationContext = createContext<ModerationContextValue | null>(null);

export function useModeration() {
  const value = use(ModerationContext);
  if (!value) throw new Error('useModeration must be used inside ModerationContext');
  return value;
}
