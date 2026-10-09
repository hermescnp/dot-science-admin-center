import { NextResponse } from 'next/server';
import type { ExternalServicesResponse } from '@/features/external-services/api/types';
import { listExternalServices } from '@/features/external-services/server/external-services';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = await getSupabaseServerClient();
  try {
    const body: ExternalServicesResponse = await listExternalServices(supabase);
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
