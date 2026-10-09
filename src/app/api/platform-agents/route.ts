import { NextResponse } from 'next/server';
import { platformAgentSchema } from '@/features/platform-agents/schemas/platform-agent';
import {
  PlatformAgentConflictError,
  createPlatformAgent,
  listPlatformAgents
} from '@/features/platform-agents/server/platform-agents';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = await getSupabaseServerClient();
  try {
    const agents = await listPlatformAgents(supabase);
    return NextResponse.json({ agents }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = platformAgentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid agent' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    const agent = await createPlatformAgent(supabase, parsed.data);
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    const status = error instanceof PlatformAgentConflictError ? 409 : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
