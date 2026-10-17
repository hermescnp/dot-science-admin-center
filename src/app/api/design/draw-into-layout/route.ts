import { NextResponse } from 'next/server';
import { drawIntoLayoutSchema } from '@/features/design-board/api/types';
import { drawIntoLayout } from '@/features/design-board/server/draw-into-layout';
import { requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = drawIntoLayoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    return NextResponse.json(await drawIntoLayout(parsed.data));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
