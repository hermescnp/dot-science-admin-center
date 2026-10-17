import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MAX_SCENE_BYTES, sceneSchema } from '@/features/design-board/api/types';
import { saveSectionScene } from '@/features/design-board/server/design-board';
import { getAdminSession, getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid section id' }, { status: 400 });

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_SCENE_BYTES) {
    return NextResponse.json({ error: 'Canvas is too large' }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid canvas' }, { status: 400 });
  }
  const parsed = sceneSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid canvas' }, { status: 400 });

  try {
    const { user } = await getAdminSession();
    const result = await saveSectionScene(
      await getSupabaseServerClient(),
      id.data,
      parsed.data,
      user!.id
    );
    if (!result) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
