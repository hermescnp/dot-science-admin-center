import { NextResponse } from 'next/server';
import { getOrgProfile, listDepartments } from '@/features/org-structure/server/departments';
import type { ZoneContent } from '@/features/virtual-office/api/types';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = await getSupabaseServerClient();
  try {
    const [departments, organization] = await Promise.all([
      listDepartments(supabase),
      getOrgProfile(supabase)
    ]);
    const zones: ZoneContent[] = departments.flatMap(
      ({ zoneKey, name, imageUrl, longDescription }) =>
        zoneKey ? [{ zoneKey, name, imageUrl, longDescription }] : []
    );
    if (organization.zoneKey) {
      zones.push({
        zoneKey: organization.zoneKey,
        name: null,
        imageUrl: organization.imageUrl,
        longDescription: organization.longDescription
      });
    }
    return NextResponse.json({ zones }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
