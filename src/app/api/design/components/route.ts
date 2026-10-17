import { NextResponse } from 'next/server';
import { componentSchema } from '@/features/design-board/api/types';
import {
  createComponent,
  getDesignComponents
} from '@/features/design-board/server/design-components';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const components = await getDesignComponents(await getSupabaseServerClient());
    return NextResponse.json(components, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = componentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const component = await createComponent(await getSupabaseServerClient(), parsed.data);
    return NextResponse.json(component, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
