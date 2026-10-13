import { NextResponse } from 'next/server';
import { createLayerSchema } from '@/features/knowledge-base/api/types';
import { createLayer, getKnowledgeBase } from '@/features/knowledge-base/server/knowledge-base';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const base = await getKnowledgeBase(await getSupabaseServerClient());
    return NextResponse.json(base, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = createLayerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const layer = await createLayer(await getSupabaseServerClient(), parsed.data);
    return NextResponse.json(layer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
