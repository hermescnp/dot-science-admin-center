import { NextResponse } from 'next/server';
import { getRoadmap } from '@/features/roadmap/server/roadmap';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const roadmap = await getRoadmap(await getSupabaseServerClient());
    return NextResponse.json(roadmap, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
