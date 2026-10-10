import { NextResponse, type NextRequest } from 'next/server';
import { userListQuerySchema } from '@/features/users/schemas/user';
import { UserForbiddenError, listUsers } from '@/features/users/server/users';
import { getSupabaseServerClient, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const query = userListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await getSupabaseServerClient();
  try {
    const body = await listUsers(supabase, query);
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = error instanceof UserForbiddenError ? 403 : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
