import type { Json } from '@hermescnp/supabase';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type {
  ArchitectureGraphResponse,
  ArchitectureGraphSnapshot
} from '@/features/architecture/api/types';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const GRAPH_ID = 'platform';

const snapshotSchema = z.object({
  seedHash: z.string().min(1),
  nodes: z
    .array(
      z.looseObject({
        id: z.string(),
        kind: z.enum(['app', 'agent', 'orchestrator', 'subagent', 'service']),
        position: z.object({ x: z.number(), y: z.number() }),
        data: z.record(z.string(), z.unknown())
      })
    )
    .max(500),
  edges: z
    .array(
      z.looseObject({
        source: z.string(),
        sourceHandle: z.string(),
        target: z.string(),
        targetHandle: z.string(),
        kind: z.enum(['service', 'platform', 'orchestration']),
        planned: z.boolean()
      })
    )
    .max(2000)
});

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('admin_architecture_graphs')
    .select('nodes, edges, seed_hash, updated_at')
    .eq('id', GRAPH_ID)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const body: ArchitectureGraphResponse = {
    graph: data
      ? {
          nodes: data.nodes as unknown as ArchitectureGraphSnapshot['nodes'],
          edges: data.edges as unknown as ArchitectureGraphSnapshot['edges'],
          seedHash: data.seed_hash,
          updatedAt: data.updated_at
        }
      : null
  };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = snapshotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid graph snapshot' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from('admin_architecture_graphs').upsert({
    id: GRAPH_ID,
    nodes: parsed.data.nodes as Json,
    edges: parsed.data.edges as Json,
    seed_hash: parsed.data.seedHash
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
