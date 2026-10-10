import { NextResponse } from 'next/server';
import { z } from 'zod';
import { leadUpdateSchema } from '@/features/leads/schemas/lead';
import { updateLead } from '@/features/leads/server/leads';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

const idSchema = z.uuid();

export async function PATCH(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  const parsed = leadUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) {
    return NextResponse.json({ error: 'Invalid lead' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    const updated = await updateLead(supabase, id.data, parsed.data);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
