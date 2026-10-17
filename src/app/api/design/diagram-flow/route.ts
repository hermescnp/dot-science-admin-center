import { NextResponse } from 'next/server';
import { diagramFlowSchema } from '@/features/design-board/api/types';
import { generateMermaid } from '@/features/design-board/server/diagram-flow';
import { requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = diagramFlowSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    return NextResponse.json({ mermaid: await generateMermaid(parsed.data.prompt) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
