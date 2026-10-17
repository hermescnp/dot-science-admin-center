import { NextResponse } from 'next/server';
import { z } from 'zod';
import { vibeEditSchema } from '@/features/design-board/api/types';
import { vibeEditComponent } from '@/features/design-board/server/component-vibe-edit';
import { getAdminSession, getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const idSchema = z.string().uuid();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid component id' }, { status: 400 });

  const parsed = vibeEditSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const { user } = await getAdminSession();
    const result = await vibeEditComponent(
      await getSupabaseServerClient(),
      id.data,
      parsed.data.prompt,
      user!.id
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
