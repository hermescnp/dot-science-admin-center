import { NextResponse, type NextRequest } from 'next/server';
import { eventPayloadSchema, eventRangeQuerySchema } from '@/features/calendar/schemas/event';
import { createEvent, listEvents } from '@/features/calendar/server/events';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const range = eventRangeQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!range.success) return NextResponse.json({ error: 'Invalid range' }, { status: 400 });

  const supabase = await getSupabaseServerClient();
  try {
    const body = await listEvents(supabase, range.data);
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = eventPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });

  const supabase = await getSupabaseServerClient();
  try {
    const event = await createEvent(supabase, parsed.data);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
