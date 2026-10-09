import { NextResponse } from 'next/server';
import type { ServicePlansResponse } from '@/features/architecture/api/types';
import { detectServicePlans } from '@/features/architecture/server/plan-detection';
import { getAdminSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user, isAdmin } = await getAdminSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body: ServicePlansResponse = { services: await detectServicePlans() };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
