import { NextResponse } from 'next/server';
import { createSectionSchema } from '@/features/knowledge-base/api/types';
import { createSection } from '@/features/knowledge-base/server/knowledge-base';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = createSectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const section = await createSection(await getSupabaseServerClient(), parsed.data);
    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
