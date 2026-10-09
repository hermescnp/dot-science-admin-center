import { NextResponse } from 'next/server';
import { fetchModelPricing } from '@/features/architecture/server/openrouter-models';
import { getAdminSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user, isAdmin } = await getAdminSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    return NextResponse.json(await fetchModelPricing(), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch {
    return NextResponse.json({ error: 'OpenRouter catalogue unavailable' }, { status: 502 });
  }
}
