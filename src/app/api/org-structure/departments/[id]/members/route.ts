import { NextResponse } from 'next/server';
import {
  departmentIdSchema,
  departmentMemberSchema
} from '@/features/org-structure/schemas/department';
import {
  addDepartmentMember,
  departmentErrorStatus
} from '@/features/org-structure/server/departments';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = departmentIdSchema.safeParse((await params).id);
  const parsed = departmentMemberSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) {
    return NextResponse.json({ error: 'Invalid member' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    await addDepartmentMember(supabase, id.data, parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: departmentErrorStatus(error) }
    );
  }
}
