import { NextResponse } from 'next/server';
import { departmentIdSchema } from '@/features/org-structure/schemas/department';
import {
  clearDepartmentImage,
  departmentErrorStatus,
  setDepartmentImage
} from '@/features/org-structure/server/departments';
import { readImageUpload } from '@/features/org-structure/server/image-upload';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = departmentIdSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const file = await readImageUpload(request);
  if (file instanceof NextResponse) return file;

  const supabase = await getSupabaseServerClient();
  try {
    const updated = await setDepartmentImage(supabase, id.data, file);
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
    const cleared = await clearDepartmentImage(supabase, id.data);
    if (!cleared) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
