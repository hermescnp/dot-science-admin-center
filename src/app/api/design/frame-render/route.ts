import { NextResponse } from 'next/server';
import { frameRenderSchema } from '@/features/design-board/api/types';
import { renderFrameImage } from '@/features/design-board/server/frame-render';
import { requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = frameRenderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    return NextResponse.json(await renderFrameImage(parsed.data));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
