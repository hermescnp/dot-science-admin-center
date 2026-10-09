import { NextResponse } from 'next/server';
import * as z from 'zod';
import { externalServiceItemPayloadSchema } from '@/features/external-services/schemas/external-service';
import {
  deleteExternalServiceItem,
  updateExternalServiceItem
} from '@/features/external-services/server/external-services';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ itemId: string }> };

const itemId = z.uuid();
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

export async function PATCH(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = itemId.safeParse((await params).itemId);
  if (!id.success) return notFound();

  const parsed = externalServiceItemPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid item' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    const item = await updateExternalServiceItem(supabase, id.data, parsed.data);
    return item ? NextResponse.json(item) : notFound();
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = itemId.safeParse((await params).itemId);
  if (!id.success) return notFound();

  const supabase = await getSupabaseServerClient();
  try {
    const deleted = await deleteExternalServiceItem(supabase, id.data);
    return deleted ? NextResponse.json({ success: true }) : notFound();
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
