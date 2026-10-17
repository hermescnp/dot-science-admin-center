import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateComponentSchema } from '@/features/design-board/api/types';
import { deleteComponent, updateComponent } from '@/features/design-board/server/design-components';
import { getAdminSession, getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid component id' }, { status: 400 });

  const parsed = updateComponentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const { user } = await getAdminSession();
    const component = await updateComponent(
      await getSupabaseServerClient(),
      id.data,
      parsed.data,
      user!.id
    );
    if (!component) return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    return NextResponse.json(component);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid component id' }, { status: 400 });

  try {
    const deleted = await deleteComponent(await getSupabaseServerClient(), id.data);
    if (!deleted) return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
