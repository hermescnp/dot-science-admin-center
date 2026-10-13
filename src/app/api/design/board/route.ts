import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MAX_SCENE_BYTES } from '@/features/design-board/api/types';
import { getDesignBoard, saveDesignBoard } from '@/features/design-board/server/design-board';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const sceneSchema = z.object({
  scene: z.object({
    elements: z.array(z.unknown()),
    files: z.record(z.string(), z.unknown()),
    appState: z.object({ viewBackgroundColor: z.string().max(64).optional() })
  })
});

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const board = await getDesignBoard(await getSupabaseServerClient());
    return NextResponse.json(board, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_SCENE_BYTES) {
    return NextResponse.json({ error: 'Board is too large' }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid board' }, { status: 400 });
  }
  const parsed = sceneSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid board' }, { status: 400 });

  try {
    const result = await saveDesignBoard(await getSupabaseServerClient(), parsed.data.scene);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
