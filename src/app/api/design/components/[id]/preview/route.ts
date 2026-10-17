import { NextResponse } from 'next/server';
import { z } from 'zod';
import { refinePreviewSchema } from '@/features/design-board/api/types';
import { refineComponentPreview } from '@/features/design-board/server/component-preview';
import { getAdminSession, getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const idSchema = z.string().uuid();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: 'Invalid component id' }, { status: 400 });

  const body = refinePreviewSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const { user } = await getAdminSession();
    const component = await refineComponentPreview(
      await getSupabaseServerClient(),
      id.data,
      user!.id,
      body.data.change
    );
    return NextResponse.json(component);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
