'use client';

import { parseAsBoolean, useQueryState } from 'nuqs';

/** Page-wide: price every plan at its average use of limits instead of the full limits. */
export function useAverageCompensation() {
  return useQueryState('compensation', parseAsBoolean.withDefault(false));
}
