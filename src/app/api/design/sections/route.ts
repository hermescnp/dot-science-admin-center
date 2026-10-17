import { NextResponse } from 'next/server';
import { sectionTitleSchema } from '@/features/design-board/api/types';
import { createSection, getDesignSections } from '@/features/design-board/server/design-board';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const sections = await getDesignSections(await getSupabaseServerClient());
    return NextResponse.json(sections, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = sectionTitleSchema.safeParse(await request.json().catch(() => null));
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
