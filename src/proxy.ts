import { updateSession } from '@hermescnp/auth/handlers';
import type { NextRequest } from 'next/server';

// Route protection lives in the /dashboard layout via `getAdminSession()`.
// The proxy only refreshes the Supabase session cookie on every request.
export function proxy(request: NextRequest) {
  // @hermescnp/auth is typed against its own `next` devDependency, so the
  // NextRequest types differ nominally even though the runtime shape is identical.
  return updateSession(request as unknown as Parameters<typeof updateSession>[0]);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ]
};
