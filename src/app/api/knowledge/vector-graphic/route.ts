import { NextResponse } from 'next/server';
import { generateVectorGraphicSchema } from '@/features/knowledge-base/api/types';
import { generateVectorGraphicSvg } from '@/features/knowledge-base/server/vector-graphic';
import { requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = generateVectorGraphicSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const svg = await generateVectorGraphicSvg(parsed.data);
    return NextResponse.json({ svg });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
