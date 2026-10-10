import { NextResponse } from 'next/server';
import { z } from 'zod';
import { userUpdateSchema } from '@/features/users/schemas/user';
import { UserForbiddenError, updateUser } from '@/features/users/server/users';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

const idSchema = z.uuid();

export async function PATCH(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = idSchema.safeParse((await params).id);
  const parsed = userUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  try {
    const user = await updateUser(supabase, id.data, parsed.data);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    const status = error instanceof UserForbiddenError ? 403 : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
