import { apiClient } from '@/lib/api-client';
import { virtualOfficeAsset } from '../lib/assets';
import type { SpaceZone, ZoneContent } from './types';

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(virtualOfficeAsset(path));
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json() as Promise<T>;
}

async function getZoneContents(): Promise<ZoneContent[]> {
  const { zones } = await apiClient<{ zones: ZoneContent[] }>('/virtual-office/zones', {
    cache: 'no-store'
  });
  return zones;
}

function zoneDocumentation(name: string, { imageUrl, longDescription }: ZoneContent) {
  return [`# ${name}`, imageUrl ? `![${name}](${imageUrl})` : null, longDescription]
    .filter(Boolean)
    .join('\n\n');
}

/** Zone geometry comes from space-map.json; the main space and department zones take their text from the database. */
export async function getSpaceMap(): Promise<SpaceZone[]> {
  const [zones, contents] = await Promise.all([
    fetchJson<SpaceZone[]>('/models/space-map.json'),
    // The scene still works with the bundled text if the database content can't be loaded.
    getZoneContents().catch(() => [])
  ]);

  const byZone = new Map(contents.map((content) => [content.zoneKey, content]));
  return zones.map((zone) => {
    const content = byZone.get(zone.key);
    if (!content) return zone;
    const name = content.name ?? zone.name;
    return { ...zone, name, documentation: zoneDocumentation(name, content) };
  });
}
