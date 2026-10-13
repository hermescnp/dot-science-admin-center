import { NextResponse } from 'next/server';
import { departmentIdSchema, departmentSchema } from '@/features/org-structure/schemas/department';
import {
  deleteDepartment,
  departmentErrorStatus,
  updateDepartment
} from '@/features/org-structure/server/departments';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = departmentIdSchema.safeParse((await params).id);
  const parsed = departmentSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) {
    return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    const updated = await updateDepartment(supabase, id.data, parsed.data);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: departmentErrorStatus(error) }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = departmentIdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const supabase = await getSupabaseServerClient();
  try {
    const deleted = await deleteDepartment(supabase, id.data);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
