import { NextResponse } from 'next/server';
import type { ServiceHealthResponse } from '@/features/architecture/api/types';
import { checkServiceHealth } from '@/features/architecture/server/health-checks';
import { getAdminSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user, isAdmin } = await getAdminSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body: ServiceHealthResponse = { services: await checkServiceHealth() };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
