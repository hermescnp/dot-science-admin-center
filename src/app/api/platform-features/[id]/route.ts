import { NextResponse } from 'next/server';
import { z } from 'zod';
import { platformFeatureSchema } from '@/features/platform-features/schemas/platform-feature';
import {
  PlatformFeatureConflictError,
  deletePlatformFeature,
  updatePlatformFeature
} from '@/features/platform-features/server/platform-features';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

const idSchema = z.uuid();

export async function PATCH(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  const parsed = platformFeatureSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) {
    return NextResponse.json({ error: 'Invalid feature' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    const feature = await updatePlatformFeature(supabase, id.data, parsed.data);
    if (!feature) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(feature);
  } catch (error) {
    const status = error instanceof PlatformFeatureConflictError ? 409 : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const supabase = await getSupabaseServerClient();
  try {
    const deleted = await deletePlatformFeature(supabase, id.data);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
