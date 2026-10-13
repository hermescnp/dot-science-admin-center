import type { SpaceZone } from '../api/types';

export function findParentKey(data: SpaceZone[], key: string): string | null {
  return data.find((item) => item.key === key)?.parentKey ?? null;
}

export function isInstanceDescendant(current: string, previous: string, data: SpaceZone[]) {
  let parentKey = findParentKey(data, current);

  while (parentKey !== null) {
    if (parentKey === previous) {
      return true;
    }
    parentKey = findParentKey(data, parentKey);
  }

  return false;
}

export function isInstanceSibling(current: string, previous: string, data: SpaceZone[]) {
  return findParentKey(data, current) === findParentKey(data, previous);
}
