import { NextResponse, type NextRequest } from 'next/server';
import { leadListQuerySchema } from '@/features/leads/schemas/lead';
import { LeadForbiddenError, listLeads } from '@/features/leads/server/leads';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const query = leadListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await getSupabaseServerClient();
  try {
    const body = await listLeads(supabase, query);
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = error instanceof LeadForbiddenError ? 403 : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
