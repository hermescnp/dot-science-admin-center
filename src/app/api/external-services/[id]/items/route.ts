import { NextResponse } from 'next/server';
import { externalServiceItemPayloadSchema } from '@/features/external-services/schemas/external-service';
import {
  insertExternalServiceItem,
  isServiceNode
} from '@/features/external-services/server/external-services';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!isServiceNode(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parsed = externalServiceItemPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid item' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    return NextResponse.json(await insertExternalServiceItem(supabase, id, parsed.data), {
      status: 201
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
