import { NextResponse } from 'next/server';
import { featureSubtaskCreateSchema } from '@/features/feature-subtasks/schemas/feature-subtask';
import {
  createFeatureSubtask,
  listFeatureSubtasks
} from '@/features/feature-subtasks/server/feature-subtasks';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = await getSupabaseServerClient();
  try {
    const subtasks = await listFeatureSubtasks(supabase);
    return NextResponse.json({ subtasks }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = featureSubtaskCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid subtask' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    const subtask = await createFeatureSubtask(supabase, parsed.data);
    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
