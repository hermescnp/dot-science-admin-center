import { createServerClient, type Database } from '@hermescnp/supabase';
import { isPlatformAdmin } from '@hermescnp/workspace-sdk';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { cache } from 'react';

export type AdminSession = {
  user: User | null;
  isAdmin: boolean;
};

export const getSupabaseServerClient = cache(async (): Promise<SupabaseClient<Database>> => {
  const cookieStore = await cookies();
  const client = createServerClient({
    getAll: () => cookieStore.getAll(),
    // Server Components can't write cookies; the proxy refreshes the session.
    setAll: () => {}
  });
  // @supabase/ssr 0.6 types its client against an older supabase-js, which collapses table
  // types to `never`; the runtime client is the same.
  return client as unknown as SupabaseClient<Database>;
});

export const getAdminSession = cache(async (): Promise<AdminSession> => {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false };

  try {
    // workspace-sdk is typed against its own supabase-js copy; the runtime client is the same.
    const client = supabase as unknown as Parameters<typeof isPlatformAdmin>[0];
    return { user, isAdmin: await isPlatformAdmin(client) };
  } catch {
    return { user, isAdmin: false };
  }
});

/** For route handlers: an error response when the caller isn't a platform admin, otherwise null. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const { user, isAdmin } = await getAdminSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}
