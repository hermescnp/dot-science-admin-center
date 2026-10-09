import { NextResponse } from 'next/server';
import {
  externalServicePayloadSchema,
  isKnownPlan
} from '@/features/external-services/schemas/external-service';
import {
  isServiceNode,
  upsertExternalService
} from '@/features/external-services/server/external-services';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isServiceNode(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parsed = externalServicePayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isKnownPlan(id, parsed.data.planId)) {
    return NextResponse.json({ error: 'Invalid service billing' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    return NextResponse.json(await upsertExternalService(supabase, id, parsed.data));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
