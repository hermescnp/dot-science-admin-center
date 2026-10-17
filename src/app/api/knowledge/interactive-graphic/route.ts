import { NextResponse } from 'next/server';
import { generateInteractiveGraphicSchema } from '@/features/knowledge-base/api/types';
import { generateInteractiveGraphicCode } from '@/features/knowledge-base/server/interactive-graphic';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = generateInteractiveGraphicSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const code = await generateInteractiveGraphicCode(await getSupabaseServerClient(), parsed.data);
    return NextResponse.json({ code });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
