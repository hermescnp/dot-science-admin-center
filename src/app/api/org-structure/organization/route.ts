import { NextResponse } from 'next/server';
import { orgProfileSchema } from '@/features/org-structure/schemas/department';
import { getOrgProfile, updateOrgProfile } from '@/features/org-structure/server/departments';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = await getSupabaseServerClient();
  try {
    const organization = await getOrgProfile(supabase);
    return NextResponse.json({ organization }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = orgProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid organization' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    await updateOrgProfile(supabase, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
