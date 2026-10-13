import { NextResponse } from 'next/server';
import { z } from 'zod';
import { departmentIdSchema } from '@/features/org-structure/schemas/department';
import { removeDepartmentMember } from '@/features/org-structure/server/departments';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string; memberId: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id: rawId, memberId: rawMemberId } = await params;
  const id = departmentIdSchema.safeParse(rawId);
  const memberId = z.uuid().safeParse(rawMemberId);
  if (!id.success || !memberId.success) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    const removed = await removeDepartmentMember(supabase, id.data, memberId.data);
    if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
