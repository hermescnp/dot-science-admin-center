import { NextResponse } from 'next/server';
import { getLatestStarmapSnapshot } from '@/features/starmap/server/snapshots';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await getLatestStarmapSnapshot(await getSupabaseServerClient());
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
