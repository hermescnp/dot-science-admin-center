import { NextResponse } from 'next/server';
import { z } from 'zod';
import { featureSubtaskUpdateSchema } from '@/features/feature-subtasks/schemas/feature-subtask';
import {
  deleteFeatureSubtask,
  updateFeatureSubtask
} from '@/features/feature-subtasks/server/feature-subtasks';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

const idSchema = z.uuid();

export async function PATCH(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  const parsed = featureSubtaskUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) {
    return NextResponse.json({ error: 'Invalid subtask' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    const subtask = await updateFeatureSubtask(supabase, id.data, parsed.data);
    if (!subtask) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(subtask);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const supabase = await getSupabaseServerClient();
  try {
    const deleted = await deleteFeatureSubtask(supabase, id.data);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
