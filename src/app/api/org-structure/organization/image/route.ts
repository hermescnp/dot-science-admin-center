import { NextResponse } from 'next/server';
import {
  clearOrgProfileImage,
  departmentErrorStatus,
  setOrgProfileImage
} from '@/features/org-structure/server/departments';
import { readImageUpload } from '@/features/org-structure/server/image-upload';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const file = await readImageUpload(request);
  if (file instanceof NextResponse) return file;

  const supabase = await getSupabaseServerClient();
  try {
    const updated = await setOrgProfileImage(supabase, file);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: departmentErrorStatus(error) }
    );
  }
}

export async function DELETE() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = await getSupabaseServerClient();
  try {
    const cleared = await clearOrgProfileImage(supabase);
    if (!cleared) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
