'use client';

import { useMemo } from 'react';
import type { NavGroup } from '@/types';

/**
 * Navigation groups for the sidebar and Cmd+K bar, with empty groups removed.
 * Everyone inside /dashboard is a platform admin, so no per-item filtering is needed.
 */
export function useFilteredNavGroups(groups: NavGroup[]) {
  return useMemo(() => groups.filter((group) => group.items.length > 0), [groups]);
}
