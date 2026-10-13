import { NextResponse } from 'next/server';
import { departmentSchema } from '@/features/org-structure/schemas/department';
import {
  createDepartment,
  departmentErrorStatus,
  listDepartments
} from '@/features/org-structure/server/departments';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = await getSupabaseServerClient();
  try {
    const departments = await listDepartments(supabase);
    return NextResponse.json({ departments }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = departmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    await createDepartment(supabase, parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: departmentErrorStatus(error) }
    );
  }
}
