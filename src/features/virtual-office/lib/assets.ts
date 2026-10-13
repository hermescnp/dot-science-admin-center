export const VIRTUAL_OFFICE_ASSETS_BASE = '/virtual-office';

export function virtualOfficeAsset(path: string): string {
  return `${VIRTUAL_OFFICE_ASSETS_BASE}${path}`;
}
