import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sectionTitleSchema } from '@/features/design-board/api/types';
import { deleteSection, renameSection } from '@/features/design-board/server/design-board';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid section id' }, { status: 400 });

  const parsed = sectionTitleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const updated = await renameSection(await getSupabaseServerClient(), id.data, parsed.data);
    if (!updated) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid section id' }, { status: 400 });

  try {
    const deleted = await deleteSection(await getSupabaseServerClient(), id.data);
    if (!deleted) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
