import { createAuthCallbackHandler } from '@hermescnp/auth/handlers';
import type { NextRequest } from 'next/server';

const handleCallback = createAuthCallbackHandler({ defaultNext: '/dashboard/overview' });

// @hermescnp/auth is typed against its own `next` devDependency; see src/proxy.ts.
export function GET(request: NextRequest) {
  return handleCallback(request as unknown as Parameters<typeof handleCallback>[0]);
}
